const mysql = require('mysql')
const db = mysql.createConnection({
    host: "bzizaxbwlogkymgc0hfm-mysql.services.clever-cloud.com",
    user: "ud4bcst5oh325rxe",
    password: "TiNeGhH0Bax414lNtHQ9",
    database: "bzizaxbwlogkymgc0hfm"

})
module.exports = db