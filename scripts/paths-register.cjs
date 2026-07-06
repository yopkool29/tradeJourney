const Module = require('module')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')

const originalResolveFilename = Module._resolveFilename
Module._resolveFilename = function (request, parent, ...args) {
	if (request === '~') {
		request = projectRoot
	} else if (request.startsWith('~/')) {
		request = path.join(projectRoot, request.slice(2))
	}
	return originalResolveFilename.call(this, request, parent, ...args)
}
