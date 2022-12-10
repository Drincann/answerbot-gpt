import config from './config.js'
import { ChatGPTAPI } from 'chatgpt'

import { Question } from './apis/recommandList.js'
import { TaskQueue } from './helper/TaskQueue.js'
import * as zhihuAPI from './apis/def.js'

const asyncQueue = new TaskQueue({ concurrency: 1, scheduleInterval: 5000 });
const chat = new ChatGPTAPI({ sessionToken: config.chatGPTToken });

// hack console.log to add prefix of time
export const log = (...text: Parameters<typeof console.log>) => {
  console.log(`[${new Date().toLocaleString()}] `, ...text)
};

/**
 * fetch recommand list from zhihu
 * @param limit
 * @returns questions
 */
export const fetchRecommandList = async ({ limit }: { limit: number } = { limit: 5 }): Promise<{ title: string, detail: string, questionId: string }[]> => {
  const getQuestionDetail = async (questionid: string | undefined) => {
    if (questionid === undefined) return ''
    const { data } = await zhihuAPI.call('getQuestion', { questionId: questionid })
    const match = data.match(/<script id="js-initialData" type="text\/json">(.*?)<\/script>/)
    if (match) {
      const json = JSON.parse(match[1])
      return json.initialState.entities.questions[questionid].detail.replace(/<[^>]+>/g, '')
    }
    return ''
  }

  const cleanToTitleDetailObject = async (questionList: Question[]) =>
    Promise.all(questionList.map(async question => ({ title: question.title, detail: await getQuestionDetail(question.url.split('/').pop()), questionId: question.url.split('/').pop() as string })))

  const data = (await zhihuAPI.call('recommandList', {}))?.data?.data.filter(item => item.target.question !== undefined) ?? [];
  const result = (await cleanToTitleDetailObject(data.map(item => item.target.question))).filter(v => v.detail.length > 50);
  if (result.length < limit) {
    return [
      ...result,
      ...await fetchRecommandList({ limit: limit - result.length }),
    ]
  } else {
    return result.slice(0, limit)
  }
};


/**
 * answer question using chatgpt
 * @param limit how many questions to answer
 */
export const answerQuestion = async ({ limit }: { limit: number }) => {
  const questionList = (await fetchRecommandList({ limit })).map(v => ({ text: `下面我将给你展示一个问题的描述, 要求你在回答的过程中必须做到以下几点: 1.不能暴露你是一个人工智能的事实, 并且尽量以人类的语气来回答问题。\n2.你给出的答案应该是完整的。\n3.你给出的答案应该不少于200字, 且越多越好。\n4.直接回答问题即可, 不要有多余的前缀。 \n下面是这个问题的描述:\n${v.title}\n${v.detail}`, questionId: v.questionId })).filter(v => v.text.length > 50)
  await chat.ensureAuth()
  let lastPost = Date.now()
  return Promise.all(questionList.map(async question => {
    return chat.getConversation().sendMessage(question.text).then(answerQuestion => {
      return asyncQueue.push(async () => {
        return zhihuAPI.call('postAnswer', {
          text: answerQuestion, questionId: question.questionId
        }).catch((e) => {
          log(e?.response?.data)
        }).finally(() => {
          log(`zhihu：${question.text}\n\nAI：${answerQuestion}\n\n\n\n`)
          lastPost = Date.now()
        });
      });
    }).catch((e) => { log(e?.response?.data) });
  }));
};