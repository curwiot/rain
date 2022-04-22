const {rain_check} = require('./Rain_Check/rain_check')
const cron = require('node-cron')
cron.schedule(' */5 * * * *', () => {
    var rain_check_1 = new rain_check();
    console.log('test')
})

