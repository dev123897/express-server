const dotenv = require('dotenv')

// Load .env file into process.env
const environment = process.env.production
  ? dotenv.config()
  : dotenv.config({ path: ['.env.local', '.env.development'] })

if(environment.error) throw environment.error
