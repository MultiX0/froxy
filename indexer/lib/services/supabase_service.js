const { createClient } = require("@supabase/supabase-js")
const dotenv = require("dotenv");

dotenv.config();

const _url = process.env.SUPABASE_URL;
const _key = process.env.SUPABASE_SERVICE_KEY;


const supabase = createClient(_url, _key);

module.exports = {
    supabase
}


