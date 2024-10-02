import sql from "mssql";
import appConfig from "../utilities/app-config.js";
import logger from "../utilities/logger.js";

const config = {
  user: appConfig.sqlServerUser,
  password: appConfig.sqlServerPassword,
  server: appConfig.sqlServerHost,
  database: appConfig.sqlServerDatabase,
  options: {
    encrypt: false, // for Azure users
    trustServerCertificate: true, // change to false for production environments
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    logger('Connected to SQL Server');
    return pool;
  })
  .catch((err) => {
    console.error('Error connecting to SQL Server:', err);
    throw err;
  });

// Your execute function:
async function execute(sql, values) {
  try {
    const pool = await poolPromise;
    
    // Check if values are provided
    if (values) {
      const request = pool.request();

      // Loop through values and add them as parameters
      for (const key in values) {
        if (values.hasOwnProperty(key)) {
          request.input(key, values[key]);
        }
      }

      // Execute query with parameters
      const result = await request.query(sql);
      return result;
    } else {
      // Execute query without parameters
      const result = await pool.request().query(sql);
      return result.recordset;
    }
  } catch (err) {
    console.error('Error executing query:', err);
    throw err;
  }
}

export default {
  execute
};
