import type { ILogView } from '~/type'

type LogFunction<T> = (...input: LogArgs) => void
type LogArgs = (string | object | boolean | null | number | undefined)[]

export const useLogView = <T extends ILogView>() => {
    const getLogView = () => {
        const myLogView = useState<T | null>('myLogView', () => null)
        return myLogView.value as T
    }

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

    const logFunction = (logMethod: (logView: T, message: string) => void): LogFunction<T> => {
        return (...input: LogArgs) => {
            const finalStr = argsToString2Array(input).join('\n')
            const logView = getLogView()
            if (logView) {
                logMethod(logView, finalStr)
            }
        }
    }

    const log_debug = logFunction((logView, message) => {
        if (message)
            logView.debug(message)
    })

    const log_info = logFunction((logView, message) => {
        if (message)
            logView.info(message)
    })

    const log_warn = logFunction((logView, message) => {
        if (message)
            logView.warn(message)
    })

    const log_error = logFunction((logView, message) => {
        if (message)
            logView.error(message)
    })

    return { log_debug, log_info, log_warn, log_error }
}
