#!/usr/bin/env python3
"""Build menu for PnlTracker — ultra léger, Tkinter, sauvegarde les choix."""

import json
import os
import subprocess
import sys
import threading
import tkinter as tk
from tkinter import ttk, scrolledtext

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
CONFIG_FILE = os.path.join(PROJECT_DIR, '.build-menu.json')

# Builds disponibles: (id, label, description, command)
BUILDS = [
	('dev', 'Dev (Nuxt)', 'Dev server Nuxt sur port 3003', 'pnpm dev:tauri'),
	('tauri:dev', 'Dev Tauri', 'Dev server Nuxt + Tauri (hot reload)', 'pnpm tauri:dev'),
	('build', 'Build Nuxt', 'Build Nuxt production (.output/)', 'pnpm build'),
	('tauri:prepare', 'Prepare Tauri', 'Build Nuxt + prepare runtime (sans compiler Tauri)', 'pnpm tauri:prepare'),
	('tauri:build:exe', 'Build Tauri EXE', 'Build complet: Nuxt + runtime + exe Linux (no bundle)', 'pnpm tauri:build:exe'),
	('tauri:bundle:exe', 'Bundle Tauri EXE', 'Compile Tauri uniquement (reutilise .output existant)', 'pnpm tauri:bundle:exe'),
	('tauri:bundle:deb', 'Bundle .deb', 'Package .deb Debian', 'pnpm tauri:bundle:deb'),
	('tauri:bundle:appimage', 'Bundle AppImage', 'Package AppImage Linux', 'pnpm tauri:bundle:appimage'),
	('tauri:build:full', 'Build Full', 'Build complet + plugins + bundles', 'pnpm tauri:build:full'),
	('plugins-dev:build', 'Build Plugins', 'Compile tous les plugins-dev', 'pnpm plugins-dev:build'),
	('lint', 'Lint', 'ESLint sur tout le projet', 'pnpm lint'),
	('test', 'Test', 'Vitest', 'pnpm test'),
]

def load_config():
	"""Charge les checkboxes cochees depuis le fichier JSON."""
	try:
		with open(CONFIG_FILE, 'r') as f:
			return json.load(f)
	except (FileNotFoundError, json.JSONDecodeError):
		return {}

def save_config(checked):
	"""Sauvegarde les checkboxes cochees dans le fichier JSON."""
	with open(CONFIG_FILE, 'w') as f:
		json.dump(checked, f, indent=2)

class BuildMenu:
	def __init__(self, root):
		self.root = root
		self.root.title('PnlTracker — Build Menu')
		self.root.geometry('750x600')
		self.root.minsize(600, 400)
		self.check_vars = {}
		self.config = load_config()
		self.process = None
		self._build_ui()

	def _build_ui(self):
		# Frame principal
		main = ttk.Frame(self.root, padding=10)
		main.pack(fill=tk.BOTH, expand=True)

		# Titre
		ttk.Label(main, text='Selectionne les builds a executer:', font=('TkDefaultFont', 11, 'bold')).pack(anchor=tk.W, pady=(0, 8))

		# Frame scrollable pour les checkboxes
		list_frame = ttk.Frame(main)
		list_frame.pack(fill=tk.BOTH, expand=True)

		canvas = tk.Canvas(list_frame, highlightthickness=0)
		scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=canvas.yview)
		scrollable = ttk.Frame(canvas)

		scrollable.bind(
			'<Configure>',
			lambda e: canvas.configure(scrollregion=canvas.bbox('all'))
		)
		canvas.create_window((0, 0), window=scrollable, anchor='nw')
		canvas.configure(yscrollcommand=scrollbar.set)

		canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
		scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

		# Checkboxes
		for i, (bid, label, desc, cmd) in enumerate(BUILDS):
			row = ttk.Frame(scrollable, padding=(4, 2))
			row.pack(fill=tk.X, padx=4, pady=1)

			var = tk.BooleanVar(value=self.config.get(bid, False))
			self.check_vars[bid] = var

			cb = ttk.Checkbutton(row, text=label, variable=var, width=22)
			cb.pack(side=tk.LEFT)

			ttk.Label(row, text=desc, foreground='#666').pack(side=tk.LEFT, padx=(8, 0))
			ttk.Label(row, text=cmd, foreground='#999', font=('TkDefaultFont', 8)).pack(side=tk.RIGHT)

		# Bind mousewheel scroll
		def _on_mousewheel(event):
			canvas.yview_scroll(int(-1 * (event.delta / 120)), 'units')
		canvas.bind_all('<MouseWheel>', _on_mousewheel)

		# Boutons
		btn_frame = ttk.Frame(main)
		btn_frame.pack(fill=tk.X, pady=(8, 0))

		ttk.Button(btn_frame, text='Tout cocher', command=self._check_all).pack(side=tk.LEFT, padx=(0, 4))
		ttk.Button(btn_frame, text='Tout decocher', command=self._uncheck_all).pack(side=tk.LEFT, padx=(0, 4))
		ttk.Button(btn_frame, text='Lancer', command=self._run_builds).pack(side=tk.RIGHT)

		# Separator
		ttk.Separator(main, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=(8, 0))

		# Console output
		console_frame = ttk.Frame(main)
		console_frame.pack(fill=tk.BOTH, expand=True, pady=(8, 0))

		ttk.Label(console_frame, text='Sortie:', font=('TkDefaultFont', 9, 'bold')).pack(anchor=tk.W)

		self.console = scrolledtext.ScrolledText(console_frame, height=12, bg='#1e1e1e', fg='#d4d4d4', font=('Consolas', 9), state=tk.DISABLED)
		self.console.pack(fill=tk.BOTH, expand=True, pady=(4, 0))

		# Bouton stop
		self.stop_btn = ttk.Button(main, text='Stop', command=self._stop, state=tk.DISABLED)
		self.stop_btn.pack(side=tk.RIGHT, pady=(8, 0))

		# Status bar
		self.status = ttk.Label(main, text='Pret', relief=tk.SUNKEN, anchor=tk.W)
		self.status.pack(fill=tk.X, pady=(8, 0))

	def _check_all(self):
		for var in self.check_vars.values():
			var.set(True)

	def _uncheck_all(self):
		for var in self.check_vars.values():
			var.set(False)

	def _log(self, text):
		self.console.config(state=tk.NORMAL)
		self.console.insert(tk.END, text)
		self.console.see(tk.END)
		self.console.config(state=tk.DISABLED)

	def _set_status(self, text):
		self.status.config(text=text)

	def _run_builds(self):
		# Sauvegarder les choix
		checked = {bid: var.get() for bid, var in self.check_vars.items()}
		save_config(checked)

		# Lister les builds selectionnes
		selected = [(bid, cmd) for bid, _, _, cmd in BUILDS if self.check_vars[bid].get()]
		if not selected:
			self._set_status('Aucun build selectionne')
			return

		# Disable launch button, enable stop
		self._log('\n=== Builds selectionnes: {} ===\n\n'.format(', '.join(bid for bid, _ in selected)))

		# Lancer dans un thread
		self.process = None
		threading.Thread(target=self._run_sequence, args=(selected,), daemon=True).start()

	def _run_sequence(self, selected):
		total = len(selected)
		for i, (bid, cmd) in enumerate(selected, 1):
			self.root.after(0, self._set_status, 'Build {}/{}: {}'.format(i, total, bid))
			self.root.after(0, self._log, '--- [{}] {} ---\n'.format(i, bid))
			self.root.after(0, self._log, '$ {}\n'.format(cmd))

			# Lancer la commande
			self.process = subprocess.Popen(
				cmd,
				shell=True,
				cwd=PROJECT_DIR,
				stdout=subprocess.PIPE,
				stderr=subprocess.STDOUT,
				text=True,
				bufsize=1,
			)

			self.root.after(0, lambda: self.stop_btn.config(state=tk.NORMAL))

			# Lire la sortie en temps reel
			for line in self.process.stdout:
				self.root.after(0, self._log, line)

			ret = self.process.wait()
			if ret == 0:
				self.root.after(0, self._log, '\n[OK] {} termine\n\n'.format(bid))
			else:
				self.root.after(0, self._log, '\n[ERREUR] {} a echoue (code {})\n\n'.format(bid, ret))
				break

			self.process = None

		self.root.after(0, lambda: self.stop_btn.config(state=tk.DISABLED))
		self.root.after(0, self._set_status, 'Termine')

	def _stop(self):
		if self.process:
			self.process.terminate()
			self._log('\n[STOP] Process termine par l\'utilisateur\n\n')

def main():
	root = tk.Tk()
	root.style = ttk.Style()
	# Theme systeme
	try:
		root.style.theme_use('clam')
	except tk.TclError:
		pass

	app = BuildMenu(root)
	root.mainloop()

if __name__ == '__main__':
	main()
