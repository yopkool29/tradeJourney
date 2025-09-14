ent
<template>
    <div class="logwindow hidden">
        <ClientOnly>
            <div class="flex gap-x-2">
                <a href="#" class="link link-neutral link-hover" @click.stop.prevent="onClose">X</a>
                <a href="#" class="link link-neutral link-hover" @click.stop.prevent="onClear">Clear</a>
                <a href="#" class="link link-neutral link-hover" @click.stop.prevent="onDebug1">Debug1</a>
                <a href="#" class="link link-neutral link-hover" @click.stop.prevent="onDebug2">Debug2</a>
            </div>

            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="logmessage" contenteditable="false" readonly v-html="message" />
        </ClientOnly>
    </div>
</template>

<script setup lang="ts">
import type { ILogView } from '~/type'
import { safeTagsReplace } from '~/utils'

let level = 3

const message = ref('')
const userStore = useUserStore()

const display = (str: string) => {
    let uMessage = userStore.logMessage
    const result = str.split('\n')
    const lInfo = 'Info'.length
    const lDebug = 'Debug'.length
    const lError = 'Error'.length
    const lWarning = 'Warning'.length
    let cl = 'log-debug-text'
    for (const item in result) {
        let line = result[item]
        line = safeTagsReplace(line)
        line = line.replace(/ /g, '&nbsp;')
        if (line.startsWith('Info')) {
            cl = 'log-info-text'
            line = '<b>Info:</b>' + line.substring(lInfo + 1, line.length)
        } else if (line.startsWith('Debug')) {
            cl = 'log-debug-text'
            line = '<b>Debug:</b>' + line.substring(lDebug + 1, line.length)
        } else if (line.startsWith('Warning')) {
            cl = 'log-warn-text'
            line = '<b>Warning:</b>' + line.substring(lWarning + 1, line.length)
        } else if (line.startsWith('Error')) {
            cl = 'log-error-text'
            line = '<b>Error:</b>' + line.substring(lError + 1, line.length)
        }
        uMessage += `<div><span class="${cl}">${line}</div>`
    }
    userStore.setLogMessage(uMessage)
    message.value = uMessage
}

const clear = () => {
    userStore.setLogMessage('')
    message.value = ''
}

const setlevel = (_level: number) => {
    level = _level
    debug(`set level to: ${level}`)
}

const getDateStr = () => {
    const date = new Date()
    const str = date.toLocaleString()
    return str
}

const error = (message: string) => {
    try {
        if (level < 1) {
            return
        }
        display(`Error: ${getDateStr()}-> ${message}\n`)
    } catch {
        /* Ignore logging errors intentionally */
    }
}

const info = (message: string) => {
    try {
        if (level < 2) {
            return
        }
        display(`Info: ${getDateStr()}-> ${message}\n`)
    } catch {
        /* Ignore logging errors intentionally */
    }
}

const warn = (message: string) => {
    try {
        if (level < 2) {
            return
        }
        display(`Warning: ${getDateStr()}-> ${message}\n`)
    } catch {
        /* Ignore logging errors intentionally */
    }
}

const debug = (message: string) => {
    try {
        if (level < 3) {
            return
        }
        display(`Debug: ${getDateStr()}-> ${message}\n`)
    } catch {
        /* Ignore logging errors intentionally */
    }
}

const init = () => {
    clear()
    setlevel(3)
    info('log init...')
    debug('check debug done')
    info('check info done')
    error('check error done')
}

const onClear = () => {
    clear()
}

const onClose = () => {
    const logwindow = document.querySelector('.logwindow')
    if (logwindow) {
        logwindow.classList.add('hidden')
    }
    userStore.setLogOpen(false)
}

const onOpen = () => {
    const logwindow = document.querySelector('.logwindow')
    if (logwindow) {
        logwindow.classList.remove('hidden')
    }
    userStore.setLogOpen(true)
}

const isOpen = () => {
    const logwindow = document.querySelector('.logwindow')
    if (logwindow) {
        return !logwindow.classList.contains('hidden')
    }
    return false
}

const onDebug1 = () => {
    userStore.addDebug1()
}

const onDebug2 = () => {
    userStore.addDebug2()
}

defineExpose<ILogView>({ onClose, onOpen, isOpen, debug, info, warn, error })

onMounted(() => {
    if (userStore.getIsLogOpenFirstInit()) {
        userStore.setLogOpenFirstInit(false)
        init()
    }

    message.value = userStore.logMessage

    if (userStore.getIsLogOpen()) {
        onOpen()
    }
})
</script>
