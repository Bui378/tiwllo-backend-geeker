const Klaviyo = require('node-klaviyo')

const KlaviyoClient = new Klaviyo({
        publicToken: process.env.KLAVIYO_PUBLIC_TOKEN,
        privateToken: process.env.KLAVIYO_PRIVATE_TOKEN
    })
    
module.exports = KlaviyoClient