const klaviyoClient = require('../../klaviyo')
let logger = require('../../winston_logger')
logger = logger('services/klaviyo.ts')

/**
 * klaviyo track api
 * @params = event(name of event), properties(dynamic), email
 * @response : Add track into klaviyo api
 * @author : Ridhima
 */
export async function track(args) {
	try {
		const klaviyoStatus = await klaviyoClient.public.track(args)
		logger.info('Klaviyo tracking successfull : ', {
			klaviyoStatus: klaviyoStatus,
			event: args.event,
			properties: args.properties,
		})
	} catch (err) {
		logger.error('Klaviyo tracking api catch error : ', {
			event: args.event,
			err: err,
		})
	}
}

/**
 * klaviyo track api
 * @params = properties(dynamic), email
 * @response : Create klaviyo identity
 * @author : Ridhima
 */
export async function identify(args) {
	try {
		const klaviyoStatus = await klaviyoClient.public.identify(args)
		logger.info('Klaviyo identify successfull: ', {
			klaviyoStatus: klaviyoStatus,
			properties: args.properties,
		})
	} catch (err) {
		logger.error('Klaviyo identify api catch error : ', {
			event: args.event,
			err: err,
		})
	}
}
