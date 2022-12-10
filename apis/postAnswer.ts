import axios, { AxiosResponse } from 'axios';

export interface PostAnswerResponse {
  [key: string]: any;
}
export interface PostAnswerParams {
  text: string;
  questionId: string;
}
