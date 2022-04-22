const db_connection = require('../database/pgPoolconnection')
const { redis_class } = require('../redis/redis_client')
var moment = require('moment-timezone');

class rain_check {
  constructor() {
    (async function () {
      // //create cache
      // var redis_object = new redis_class();
      // await redis_object.create_client();


      //rain checking has been started
      var current_check = new Date();
      //rain check has started
      console.log("Rain check has been started: " + current_check.getDate() + "/"
        + (current_check.getMonth() + 1) + "/"
        + current_check.getFullYear() + " @ "
        + current_check.getHours() + ":"
        + current_check.getMinutes() + ":"
        + current_check.getSeconds())

      //get last record from the cache
      var previous_check = await new redis_class().get_value('previous_value');
      console.log(previous_check)
      if (previous_check == null) {
        // get last reading from the analysed rain dataS
        //remove 30 mins from the current time due to un availability of the cache
        previous_check = new Date(current_check - (5 * 60000))
      }
      //print last time period

      console.log("Previous value: " + previous_check.getDate() + "/"
        + (previous_check.getMonth() + 1) + "/"
        + previous_check.getFullYear() + " @ "
        + previous_check.getHours() + ":"
        + previous_check.getMinutes() + ":"
        + previous_check.getSeconds());
      console.log(get_time_string(previous_check))

      //query the database to get all rain parameter ids 
      const rain_ids = await db_connection.command("select * from meta_data where parameter_id ='2'");
      console.log(rain_ids);

      //get all values for given time period
      var time_2 = get_time_string(current_check);
      var time_1 = get_time_string(previous_check);

      console.log(time_2, time_1)
      var rain_data_array = []
      //create rain falls function
      // for (var i = 0; i++; i <= 5) {
      //   await Promise.all(rain_ids.map(async (element) => {
      //     var rain_values = await db_connection.command("select * from data where meta_id=$1 and time between ($2) and ($3) order by time DESC ", [element.meta_id, time_1, time_2]);
      //     rain_values = time_correction(rain_values);
      //     var rain_object = {
      //       station : element,
      //       rain_data : rain_values,
      //     }
      //   }))
      // }

      var rain_data = [];

      await Promise.all(rain_ids.map(async (element) => {
        var rain_values5 = await db_connection.command("select * from data where meta_id=$1 and time between ($2) and ($3) order by time DESC ", [element.meta_id, time_1, time_2]);
        //rain_values5 = time_correction(rain_values);
        //console.log(element.meta_id);
        //console.log(rain_values5);
        if (rain_values5.length != 0) {
          var time_3 = get_time_string(new Date(current_check - (30 * 60000)));
          const rain_amount_array = await db_connection.command("select * from data where meta_id=$1 and time between ($2) and ($3) order by time DESC limit $4", [element.meta_id, time_3, time_2, rain_values5.length + 1]);
          //console.log(rain_amount_array);
          //calculate rain amount

          var rain_amount_array_length = rain_amount_array.length - 1;
          var rain_amout = parseFloat(rain_amount_array[0].value) - parseFloat(rain_amount_array[rain_amount_array_length].value);
          var time_amount = (rain_amount_array[0].time - rain_amount_array[rain_amount_array_length].time) / (60000 * 5);
          console.log("rain-" + rain_amout);
          console.log("time-" + parseInt(time_amount));
          rain_data.push({
            time: parseInt(time_amount),
            meta_id: element.meta_id,
            value: rain_amout
          })
          //get top 
          //get last 
        }
        //check not reported stations 
        //check restored stations

      }))

      console.log(rain_data);

      await Promise.all(rain_data.map(async (element) => {
        var rain_portion = 0;
        if (element.time != 0) {
          //console.log("value-"+element.value);
          //console.log("time-"+element.time);
          //console.log("calculated" +(element.value/element.time))
          rain_portion = element.value / element.time;
        }
        await insert_rain_data(time_2, element.time, element.meta_id, rain_portion);

      }))
    })();
  }
}

function get_time_string(date) {
  //return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()+ "."+ date.getMilliseconds()
  var time_zone = (date).getTimezoneOffset() * 60000;
  var localISOtime = (new Date(date - time_zone)).toISOString().slice(0, -1);
  return localISOtime;
}

function time_correction(data) {
  data.forEach(element => {
    var format = 'YYYY/MM/DD HH:mm:ss';
    element.time = moment(element.time, format).tz('Asia/Colombo').format(format);
  });
  return data
}

async function insert_rain_data(current_insert_time, iterations, meta_id, value) {
  for (let i = 0; i < iterations; i++) {
    //insert into db
    console.log(current_insert_time, meta_id, value);
    const rain_amount_insert = db_connection.command("insert into rain_amount (time, meta_id, value) values ($1,$2,$3)", [current_insert_time, meta_id, value]);
    current_insert_time = get_time_string(new Date(new Date(current_insert_time) - (5 * 60000)));
  }
}


module.exports = { rain_check } 