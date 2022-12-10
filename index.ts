import cron from 'cron';
import { answerQuestion, log } from './tasklib.js';


/**
 * to answer question every 7:00 and 14:00
 */
(async () => {
  new cron.CronJob('30 41 19 * * *', async () => {
    log(`${new Date().toLocaleString()}> 开始回答问题`)
    await answerQuestion({ limit: 1 })
    log(`${new Date().toLocaleString()}> 结束回答问题`)
  }).start();
})();
