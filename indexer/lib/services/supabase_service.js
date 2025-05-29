const { createClient } = require("@supabase/supabase-js")
const dotenv = require("dotenv");

dotenv.config();

const _url = process.env.SUPABASE_URL;
const _key = process.env.SUPABASE_SERVICE_KEY;


let supabase;

async function initDB() {
    try {
      await createClient(_url, _key)        
    } catch (error) {
        console.log(error);
        throw error
    }
}



module.exports = {
    initDB,
    supabase
}


