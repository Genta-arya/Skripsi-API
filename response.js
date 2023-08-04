const { json } = require("body-parser")

const response = (statusCode, data, message, res) => {
    res.json(statusCode, {
        data,
        message,


    },)
}
module.exports = response