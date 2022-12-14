import config from './config.js'
import { ChatGPTAPI } from 'chatgpt'

import { Question as Question1 } from './apis/recommandList.js'
import { Question as Question2 } from './apis/getMemberAnswers.js'
import { TaskQueue } from './helper/TaskQueue.js'
import * as zhihuAPI from './apis/def.js'
import { asyncFilter } from './helper/asyncFilter.js'

const asyncQueue = new TaskQueue({ concurrency: 1, scheduleInterval: 5000 });
const asyncQueue200ms = new TaskQueue({ concurrency: 1, scheduleInterval: 200 });
const chat = new ChatGPTAPI({ sessionToken: config.chatGPTToken });

// hack console.log to add prefix of time
export const log = (...text: Parameters<typeof console.log>) => {
  console.log(`[${new Date().toLocaleString()}] `, ...text)
};

/**
 * fetch @MarryMea answered question list from zhihu
 * @param limit
 * @returns questions raw data
 */
export const fetchLingAnsweredQuestionList = async ({ limit }: { limit: number } = { limit: 5 }): Promise<Question2[]> => {
  const isAnswered = async (questionId: string): Promise<boolean> => {
    const result = await zhihuAPI.call('getQuestion', { questionId })
    return !/写回答/.test(result?.data ?? '')
  }

  // @ts-ignore
  const result =
    // async filter
    (
      await asyncFilter(
        (await zhihuAPI.call('getMemberAnswers', { memberName: 'MarryMea' /* @赵泠 */, limit }))
          ?.data?.data.filter(item => item.question !== undefined)
        , async item => asyncQueue200ms.push(async () => !await isAnswered(item?.question.url.split('/').pop() as string))
      )
    )
      .map(item => item.question)
  return result;
}

/**
 * fetch recommand list from zhihu
 * @param limit
 * @returns questions raw data
 */
export const fetchRecommandList = async ({ limit }: { limit: number } = { limit: 5 }): Promise<Question1[]> => {
  return (await zhihuAPI.call('recommandList', { limit }))
    ?.data?.data
    // filter question undefined
    ?.filter(item => item.target.question !== undefined).map(item => item.target.question)
    // filter question answered
    .filter(question => question.is_following === false || question.is_following === undefined)
    // filter question with too few answers 
    .filter(question => question.answer_count > 1000)
    ?? Promise.resolve([]);
};

/**
 * a common method for strategy pattern
 * @param limit
 * @returns questions clean data
 */
const fetchQuestions = async ({ limit, fetch }: {
  limit: number;
  fetch: ({ limit }: { limit: number }) => Promise<(Question1 | Question2)[]>
}): Promise<{ title: string, detail: string, questionId: string }[]> => {
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

  const cleanToTitleDetailQuestionIdObject = async (questionList: (Question1 | Question2)[]) =>
    Promise.all(questionList.map(async question => ({ title: question.title, detail: await getQuestionDetail(question.url.split('/').pop()), questionId: question.url.split('/').pop() as string })))

  const result = (await cleanToTitleDetailQuestionIdObject(await fetch({ limit })))
    // filter question with too short title and detail
    .filter(v => (v.title + v.detail).length > 50);
  if (result.length < limit) {
    return [
      ...result,
      ...await fetchQuestions({ limit: limit - result.length, fetch }),
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
  const questionList = (await fetchQuestions({ limit, fetch: fetchLingAnsweredQuestionList })).map(v => ({ text: `下面我将给你展示一个问题和对这个问题的补充描述, 要求你在回答的过程中必须做到以下几点: \n1.不能暴露你是一个人工智能的事实, 并且尽量以人类的语气来回答问题。\n2.你给出的答案应该是完整的, 不要在句子中途结束。\n3.你给出的答案应该不少于200字, 且越多越好。\n4.你给出的答案应该在合适的地方分段。\n5.直接回答问题即可, 不要有多余的前缀。\n6.不要使用"您"这样的称呼. \n下面是这个问题:\n${v.title}\n下面是对这个问题的补充描述:\n${v.detail}\n下面请你给出你的答案。`, questionId: v.questionId })).filter(v => v.text.length > 50)
  await chat.ensureAuth()
  return Promise.all(questionList.map(async question => {
    const session = chat.getConversation();
    const _continue = async (answer: string): Promise<string> => Promise.resolve(!answer.trim().endsWith('。') ? (answer + await session.sendMessage('继续').then(_continue)) : answer)
    return asyncQueue.push(() => session.sendMessage(question.text))
      // ensure answer complete
      .then(_continue)
      .then(answer => {
        return asyncQueue.push(async () => {
          return zhihuAPI.call('postAnswer', {
            text: answer, questionId: question.questionId
          }).then(
            data => log(data?.data),
            e => log(e?.response?.data)
          ).finally(() => {
            log(`zhihu：${question.text}\n\nAI：${answer}\n\n\n\n`)
          });
        });
      }).catch((e) => { log(e?.response?.data) });
  }));
};
