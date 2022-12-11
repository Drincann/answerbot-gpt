export interface GetMemberAnswersParams {
  memberName: string;
  offset?: number;
  limit?: number;
  sort_by?: 'created'/* 创建时间 */ | 'voteups'/* 赞同 */;
};

export interface Author {
  id: string;
  type: string;
  url: string;
  user_type: string;
  url_token: string;
  name: string;
  headline: string;
  avatar_url: string;
  is_org: boolean;
  is_advertiser: boolean;
  gender: number;
  badge: {
    topics: any[];
    type: string;
    description: string;
  }[];
};

export interface Question {
  question_type: string;
  created: number;
  url: string;
  title: string;
  type: string;
  id: number;
  updated_time: number;
};

export interface GetMemberAnswersResponse {
  paging: {
    previous: string;
    next: string;
    is_end: boolean;
  };
  data: {
    is_collapsed: boolean;
    url: string;
    id: number;
    updated_time: number;
    created_time: number;
    extras: string;
    answer_type: string;
    type: string;
    thumbnail: string;
    is_copyable: boolean;
    author: Author;
    question: Question;
    biz_ext: { creation_relationship: any };
  }[];
};
