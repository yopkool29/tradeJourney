import type { ILogView } from '~/type'

 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type LogFunction<T> = (...input: LogArgs) => void
type LogArgs = (string | object | boolean | null | number | undefined)[]

/**
 * Returns a composable object for logging functionality.
 * @template T - The type of the log view.
 * @returns An object containing log functions.
 */
export const useLogView = <T extends ILogView>() => {
    /**
     * Retrieves the log view object.
     * @returns The log view object of type T.
     */
    const getLogView = () => {
        const myLogView = useState<T | null>('myLogView', () => null)
        return myLogView.value as T
    }

    /**
     * Converts the log arguments to an array of strings.
     * @param input - The log arguments.
     * @returns An array of strings representing the log arguments.
     */
    const argsToString2Array = (input: LogArgs): string[] => {
        const result = input.map((item) => {
            if (typeof item === 'object') {
                return JSON.stringify(item, null, '    ')
            } else if (typeof item === 'boolean') {
                return item.toString()
            } else {
                return item
            }
        })
        return result as string[]
    }

    /**
     * Creates a log function based on the provided log method.
     * @param logMethod - The log method to be called.
     * @returns A log function that accepts log arguments and logs the message using the log method.
     */
    const logFunction = (logMethod: (logView: T, message: string) => void): LogFunction<T> => {
        return (...input: LogArgs) => {
            const finalStr = argsToString2Array(input).join('\n')
            const logView = getLogView()
            if (logView) {
                logMethod(logView, finalStr)
            }
        }
    }

    /**
     * Log function for debugging messages.
     * @param message - The message to be logged.
     */
    const log_debug = logFunction((logView, message) => {
        if (message)
            logView.debug(message)
    })

    /**
     * Log function for informational messages.
     * @param message - The message to be logged.
     */
    const log_info = logFunction((logView, message) => {
        if (message)
            logView.info(message)
    })

    /**
     * Log function for informational messages.
     * @param message - The message to be logged.
     */
    const log_warn = logFunction((logView, message) => {
        if (message)
            logView.warn(message)
    })

    /**
     * Log function for error messages.
     * @param message - The message to be logged.
     */
    const log_error = logFunction((logView, message) => {
        if (message)
            logView.error(message)
    })

    return { log_debug, log_info, log_warn, log_error }
}
