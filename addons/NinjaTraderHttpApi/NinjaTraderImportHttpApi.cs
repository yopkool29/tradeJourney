#region Using declarations
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Net;
using System.IO;
using System.Threading;
using NinjaTrader.Cbi;
using NinjaTrader.Gui;
using NinjaTrader.Gui.Tools;
using NinjaTrader.Data;
using NinjaTrader.NinjaScript;
using NinjaTrader.Core.FloatingPoint;
#endregion

namespace NinjaTrader.NinjaScript.AddOns
{
    public class NinjaTraderImportHttpApi : NinjaTrader.NinjaScript.AddOnBase
    {
        const int PORT = 8182;
        private HttpListener httpListener;
        private Thread listenerThread;
        private bool isRunning = false;
        
        // Configuration
        private int port = PORT;
        private string allowedOrigin = "*"; // CORS - à restreindre en production
        
        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Description = @"HTTP API pour importer l'historique des trades NinjaTrader dans TradeJourney";
                Name = "NinjaTraderImportHttpApi";
                Print("NinjaTraderImportHttpApi - SetDefaults called");
            }
            else if (State == State.Configure)
            {
                Print("NinjaTraderImportHttpApi - Configure called");
            }
            else if (State == State.Active)
            {
                Print("NinjaTraderImportHttpApi - Active called");
                StartHttpServer();
            }
            else if (State == State.Terminated)
            {
                Print("NinjaTraderImportHttpApi - Terminated called");
                StopHttpServer();
            }
        }
        
        private void StartHttpServer()
        {
            try
            {
                if (isRunning)
                    return;
                    
                httpListener = new HttpListener();
                httpListener.Prefixes.Add($"http://localhost:{port}/");
                httpListener.Start();
                isRunning = true;
                
                listenerThread = new Thread(new ThreadStart(Listen));
                listenerThread.IsBackground = true;
                listenerThread.Start();
                
                Print($"NinjaTrader HTTP API started on port {port}");
            }
            catch (Exception ex)
            {
                Print($"Error starting HTTP server: {ex.Message}");
            }
        }
        
        private void StopHttpServer()
        {
            try
            {
                if (httpListener != null && httpListener.IsListening)
                {
                    isRunning = false;
                    httpListener.Stop();
                    httpListener.Close();
                    
                    if (listenerThread != null && listenerThread.IsAlive)
                    {
                        listenerThread.Join(1000);
                    }
                    
                    Print("NinjaTrader HTTP API stopped");
                }
            }
            catch (Exception ex)
            {
                Print($"Error stopping HTTP server: {ex.Message}");
            }
        }
        
        private void Listen()
        {
            while (isRunning)
            {
                try
                {
                    HttpListenerContext context = httpListener.GetContext();
                    ThreadPool.QueueUserWorkItem((_) => HandleRequest(context));
                }
                catch (Exception ex)
                {
                    if (isRunning)
                    {
                        Print($"Listener error: {ex.Message}");
                    }
                }
            }
        }
        
        private void HandleRequest(HttpListenerContext context)
        {
            HttpListenerRequest request = context.Request;
            HttpListenerResponse response = context.Response;
            
            // CORS headers
            response.AddHeader("Access-Control-Allow-Origin", allowedOrigin);
            response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.AddHeader("Access-Control-Allow-Headers", "Content-Type");
            
            // Handle preflight
            if (request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = 200;
                response.Close();
                return;
            }
            
            try
            {
                string path = request.Url.AbsolutePath;
                
                if (path == "/api/trades" && request.HttpMethod == "GET")
                {
                    HandleGetTrades(request, response);
                }
                else if (path == "/api/health" && request.HttpMethod == "GET")
                {
                    HandleHealthCheck(response);
                }
                else
                {
                    response.StatusCode = 404;
                    SendResponse(response, "{\"error\":\"Endpoint not found\"}");
                }
            }
            catch (Exception ex)
            {
                response.StatusCode = 500;
                SendResponse(response, $"{{\"error\":\"{ex.Message}\"}}");
                Print($"Error processing request: {ex.Message}");
            }
        }
        
        private void HandleHealthCheck(HttpListenerResponse response)
        {
            response.StatusCode = 200;
            SendResponse(response, "{\"status\":\"ok\",\"service\":\"NinjaTrader HTTP API\"}");
        }
        
        private void HandleGetTrades(HttpListenerRequest request, HttpListenerResponse response)
        {
            try
            {
                // Paramètres optionnels
                string accountFilter = request.QueryString["account"];
                string startDateStr = request.QueryString["startDate"];
                string endDateStr = request.QueryString["endDate"];
                string format = request.QueryString["format"] ?? "json"; // json ou csv
                
                DateTime? startDate = null;
                DateTime? endDate = null;
                
                if (!string.IsNullOrEmpty(startDateStr))
                    startDate = DateTime.Parse(startDateStr);
                if (!string.IsNullOrEmpty(endDateStr))
                    endDate = DateTime.Parse(endDateStr);
                
                // Récupérer les trades
                List<TradeData> trades = GetTradesFromNinjaTrader(accountFilter, startDate, endDate);
                
                string responseContent;
                string contentType;
                
                if (format.ToLower() == "csv")
                {
                    responseContent = ConvertTradesToCsv(trades);
                    contentType = "text/csv";
                    response.AddHeader("Content-Disposition", "attachment; filename=trades.csv");
                }
                else
                {
                    responseContent = ConvertTradesToJson(trades);
                    contentType = "application/json";
                }
                
                response.ContentType = contentType;
                response.StatusCode = 200;
                SendResponse(response, responseContent);
                
                Print($"Exported {trades.Count} trades");
            }
            catch (Exception ex)
            {
                response.StatusCode = 500;
                SendResponse(response, $"{{\"error\":\"{ex.Message}\"}}");
                Print($"Error retrieving trades: {ex.Message}");
            }
        }
        
        // Représente une entrée ouverte en attente de sortie
        private class OpenEntry
        {
            public double Price { get; set; }
            public int Quantity { get; set; }
            public DateTime Time { get; set; }
            public string OrderName { get; set; }
            public string Strategy { get; set; }
            public double CommissionPerUnit { get; set; }
            public Instrument Instrument { get; set; }
        }
        
        private List<TradeData> GetTradesFromNinjaTrader(string accountFilter, DateTime? startDate, DateTime? endDate)
        {
            List<TradeData> trades = new List<TradeData>();
            int globalTradeNumber = 1;
            
            lock (Account.All)
            {
                foreach (Account account in Account.All)
                {
                    // Filtrer par compte si spécifié
                    if (!string.IsNullOrEmpty(accountFilter) && account.Name != accountFilter)
                        continue;
                    
                    // Créer une copie de la collection d'exécutions pour éviter les problèmes de thread
                    var executions = account.Executions
                        .Where(e => e.Order != null && e.Order.OrderState == OrderState.Filled)
                        .OrderBy(e => e.Time)
                        .ThenBy(e => e.Order.OrderId)
                        .ToList();
                    
                    // Grouper les exécutions par instrument
                    var execsByInstrument = executions.GroupBy(e => e.Instrument.FullName);
                    
                    foreach (var instrGroup in execsByInstrument)
                    {
                      try
                      {
                        // Position nette : > 0 = Long, < 0 = Short, 0 = Flat
                        int netPosition = 0;
                        // File d'entrées ouvertes (FIFO comme NinjaTrader)
                        var openEntries = new Queue<OpenEntry>();
                        
                        foreach (var exec in instrGroup)
                        {
                            // Déterminer la direction signée de cette exécution
                            // Buy/BuyToCover = +qty, Sell/SellShort = -qty
                            bool isBuy = exec.Order.OrderAction == OrderAction.Buy || 
                                        exec.Order.OrderAction == OrderAction.BuyToCover;
                            int signedQty = isBuy ? exec.Quantity : -exec.Quantity;
                            
                            int prevPosition = netPosition;
                            netPosition += signedQty;
                            
                            // Déterminer si c'est une entrée ou une sortie
                            // Entrée : position s'éloigne de 0 (ou passe de flat à non-flat)
                            // Sortie : position se rapproche de 0 (ou passe de non-flat à flat/inverse)
                            
                            bool isIncreasingPosition = Math.Abs(netPosition) > Math.Abs(prevPosition) || 
                                                        (prevPosition == 0 && netPosition != 0);
                            bool isReversal = (prevPosition > 0 && netPosition < 0) || 
                                             (prevPosition < 0 && netPosition > 0);
                            
                            if (isReversal)
                            {
                                // Reversal : d'abord fermer la position existante, puis ouvrir dans l'autre sens
                                int closeQty = Math.Abs(prevPosition);
                                int openQty = Math.Abs(netPosition);
                                
                                // Fermer toutes les entrées ouvertes
                                int remainingClose = closeQty;
                                while (remainingClose > 0 && openEntries.Count > 0)
                                {
                                    var entry = openEntries.Peek();
                                    int matchQty = Math.Min(remainingClose, entry.Quantity);
                                    
                                    string posStr = prevPosition > 0 ? "Long" : "Short";
                                    double pointValue = exec.Instrument.MasterInstrument.PointValue;
                                    double profit = prevPosition > 0 ?
                                        (exec.Price - entry.Price) * matchQty * pointValue :
                                        (entry.Price - exec.Price) * matchQty * pointValue;
                                    
                                    double commPerUnit = exec.Quantity > 0 ? exec.Commission / exec.Quantity : 0;
                                    double commission = (entry.CommissionPerUnit * matchQty) + 
                                                       (commPerUnit * matchQty);
                                    
                                    TradeData trade = new TradeData
                                    {
                                        TradeNumber = globalTradeNumber++,
                                        Instrument = exec.Instrument.FullName,
                                        Account = account.DisplayName,
                                        Strategy = entry.Strategy,
                                        MarketPosition = posStr,
                                        Quantity = matchQty,
                                        EntryPrice = entry.Price,
                                        ExitPrice = exec.Price,
                                        EntryTime = entry.Time,
                                        ExitTime = exec.Time,
                                        EntryName = entry.OrderName,
                                        ExitName = exec.Order.Name ?? "External",
                                        Profit = profit,
                                        Commission = commission,
                                        MAE = 0, MFE = 0, ETD = 0, Bars = 0
                                    };
                                    trades.Add(trade);
                                    
                                    entry.Quantity -= matchQty;
                                    if (entry.Quantity <= 0)
                                        openEntries.Dequeue();
                                    remainingClose -= matchQty;
                                }
                                
                                // Ouvrir la nouvelle position dans l'autre sens
                                if (openQty > 0)
                                {
                                    openEntries.Enqueue(new OpenEntry
                                    {
                                        Price = exec.Price,
                                        Quantity = openQty,
                                        Time = exec.Time,
                                        OrderName = exec.Order.Name ?? "External",
                                        Strategy = "",
                                        CommissionPerUnit = exec.Quantity > 0 ? exec.Commission / exec.Quantity : 0,
                                        Instrument = exec.Instrument
                                    });
                                }
                            }
                            else if (isIncreasingPosition)
                            {
                                // Entrée : ajouter à la file des entrées ouvertes
                                openEntries.Enqueue(new OpenEntry
                                {
                                    Price = exec.Price,
                                    Quantity = exec.Quantity,
                                    Time = exec.Time,
                                    OrderName = exec.Order.Name ?? "External",
                                    Strategy = "",
                                    CommissionPerUnit = exec.Quantity > 0 ? exec.Commission / exec.Quantity : 0,
                                    Instrument = exec.Instrument
                                });
                            }
                            else
                            {
                                // Sortie (partielle ou totale) : apparier avec les entrées ouvertes en FIFO
                                int remainingQty = exec.Quantity;
                                double exitCommissionPerUnit = exec.Quantity > 0 ? exec.Commission / exec.Quantity : 0;
                                
                                while (remainingQty > 0 && openEntries.Count > 0)
                                {
                                    var entry = openEntries.Peek();
                                    int matchQty = Math.Min(remainingQty, entry.Quantity);
                                    
                                    // Déterminer la direction depuis la position précédente
                                    string posStr = prevPosition > 0 ? "Long" : "Short";
                                    
                                    double pointValue = exec.Instrument.MasterInstrument.PointValue;
                                    double profit = prevPosition > 0 ?
                                        (exec.Price - entry.Price) * matchQty * pointValue :
                                        (entry.Price - exec.Price) * matchQty * pointValue;
                                    
                                    double commission = (entry.CommissionPerUnit * matchQty) + 
                                                       (exitCommissionPerUnit * matchQty);
                                    
                                    TradeData trade = new TradeData
                                    {
                                        TradeNumber = globalTradeNumber++,
                                        Instrument = exec.Instrument.FullName,
                                        Account = account.DisplayName,
                                        Strategy = entry.Strategy,
                                        MarketPosition = posStr,
                                        Quantity = matchQty,
                                        EntryPrice = entry.Price,
                                        ExitPrice = exec.Price,
                                        EntryTime = entry.Time,
                                        ExitTime = exec.Time,
                                        EntryName = entry.OrderName,
                                        ExitName = exec.Order.Name ?? "External",
                                        Profit = profit,
                                        Commission = commission,
                                        MAE = 0, MFE = 0, ETD = 0, Bars = 0
                                    };
                                    trades.Add(trade);
                                    
                                    entry.Quantity -= matchQty;
                                    if (entry.Quantity <= 0)
                                        openEntries.Dequeue();
                                    remainingQty -= matchQty;
                                }
                                
                                if (remainingQty > 0)
                                {
                                    Print($"Warning: {remainingQty} unmatched exit qty for {exec.Instrument.FullName} on {account.DisplayName} at {exec.Time}");
                                }
                            }
                        }
                        
                        if (openEntries.Count > 0)
                        {
                            int openQty = openEntries.Sum(e => e.Quantity);
                            Print($"Info: {openQty} open position remaining for {instrGroup.Key} on {account.DisplayName}");
                        }
                      }
                      catch (Exception ex)
                      {
                        Print($"Error in pairing for {instrGroup.Key} on {account.DisplayName}: {ex.Message}");
                      }
                    }
                }
            }
            
            // Filtrer par date si spécifié
            if (startDate.HasValue)
                trades = trades.Where(t => t.ExitTime >= startDate.Value).ToList();
            if (endDate.HasValue)
                trades = trades.Where(t => t.ExitTime <= endDate.Value).ToList();
            
            // Renuméroter les trades par compte
            var tradesByAccount = trades.OrderBy(t => t.ExitTime).GroupBy(t => t.Account)
                .Select(g => new { Account = g.Key, Trades = g.ToList() }).ToList();
            trades.Clear();
            foreach (var accountGroup in tradesByAccount)
            {
                int num = 1;
                foreach (var trade in accountGroup.Trades)
                {
                    trade.TradeNumber = num++;
                    trades.Add(trade);
                }
            }
            
            return trades.OrderBy(t => t.ExitTime).ToList();
        }
        
        private string ConvertTradesToCsv(List<TradeData> trades)
        {
            StringBuilder csv = new StringBuilder();
            
            // Header - Format NinjaTrader
            csv.AppendLine("Trade number;Instrument;Account;Strategy;Market pos.;Qty;Entry price;Exit price;Entry time;Exit time;Entry name;Exit name;Profit;Cum. net profit;Commission;MAE;MFE;ETD;Bars;");
            
            double cumulativeProfit = 0;
            
            foreach (var trade in trades)
            {
                cumulativeProfit += trade.Profit;
                
                csv.AppendLine(string.Format(
                    "{0};{1};{2};{3};{4};{5};{6:F2};{7:F2};{8:dd/MM/yyyy HH:mm:ss};{9:dd/MM/yyyy HH:mm:ss};{10};{11};{12:F2} $;{13:F2} $;{14:F2} $;{15:F2} $;{16:F2} $;{17:F2} $;{18};",
                    trade.TradeNumber,
                    trade.Instrument,
                    trade.Account,
                    trade.Strategy,
                    trade.MarketPosition,
                    trade.Quantity,
                    trade.EntryPrice,
                    trade.ExitPrice,
                    trade.EntryTime,
                    trade.ExitTime,
                    trade.EntryName,
                    trade.ExitName,
                    trade.Profit,
                    cumulativeProfit,
                    trade.Commission,
                    trade.MAE,
                    trade.MFE,
                    trade.ETD,
                    trade.Bars
                ));
            }
            
            return csv.ToString();
        }
        
        private string ConvertTradesToJson(List<TradeData> trades)
        {
            StringBuilder json = new StringBuilder();
            json.Append("{\"trades\":[");
            
            for (int i = 0; i < trades.Count; i++)
            {
                var trade = trades[i];
                
                if (i > 0)
                    json.Append(",");
                
                json.Append("{");
                json.AppendFormat("\"tradeNumber\":{0},", trade.TradeNumber);
                json.AppendFormat("\"instrument\":\"{0}\",", EscapeJson(trade.Instrument));
                json.AppendFormat("\"account\":\"{0}\",", EscapeJson(trade.Account));
                json.AppendFormat("\"strategy\":\"{0}\",", EscapeJson(trade.Strategy));
                json.AppendFormat("\"marketPosition\":\"{0}\",", trade.MarketPosition);
                json.AppendFormat("\"quantity\":{0},", trade.Quantity);
                json.AppendFormat("\"entryPrice\":{0},", trade.EntryPrice);
                json.AppendFormat("\"exitPrice\":{0},", trade.ExitPrice);
                json.AppendFormat("\"entryTime\":\"{0:yyyy-MM-ddTHH:mm:ss}\",", trade.EntryTime);
                json.AppendFormat("\"exitTime\":\"{0:yyyy-MM-ddTHH:mm:ss}\",", trade.ExitTime);
                json.AppendFormat("\"entryName\":\"{0}\",", EscapeJson(trade.EntryName));
                json.AppendFormat("\"exitName\":\"{0}\",", EscapeJson(trade.ExitName));
                json.AppendFormat("\"profit\":{0},", trade.Profit);
                json.AppendFormat("\"commission\":{0},", trade.Commission);
                json.AppendFormat("\"mae\":{0},", trade.MAE);
                json.AppendFormat("\"mfe\":{0},", trade.MFE);
                json.AppendFormat("\"etd\":{0},", trade.ETD);
                json.AppendFormat("\"bars\":{0}", trade.Bars);
                json.Append("}");
            }
            
            json.Append("],");
            json.AppendFormat("\"count\":{0}", trades.Count);
            json.Append("}");
            
            return json.ToString();
        }
        
        private string EscapeJson(string str)
        {
            if (string.IsNullOrEmpty(str))
                return "";
            
            return str.Replace("\\", "\\\\")
                     .Replace("\"", "\\\"")
                     .Replace("\n", "\\n")
                     .Replace("\r", "\\r")
                     .Replace("\t", "\\t");
        }
        
        private void SendResponse(HttpListenerResponse response, string content)
        {
            byte[] buffer = Encoding.UTF8.GetBytes(content);
            response.ContentLength64 = buffer.Length;
            response.OutputStream.Write(buffer, 0, buffer.Length);
            response.OutputStream.Close();
        }
        
        private class TradeData
        {
            public int TradeNumber { get; set; }
            public string Instrument { get; set; }
            public string Account { get; set; }
            public string Strategy { get; set; }
            public string MarketPosition { get; set; }
            public int Quantity { get; set; }
            public double EntryPrice { get; set; }
            public double ExitPrice { get; set; }
            public DateTime EntryTime { get; set; }
            public DateTime ExitTime { get; set; }
            public string EntryName { get; set; }
            public string ExitName { get; set; }
            public double Profit { get; set; }
            public double Commission { get; set; }
            public double MAE { get; set; }
            public double MFE { get; set; }
            public double ETD { get; set; }
            public int Bars { get; set; }
        }
    }
}
