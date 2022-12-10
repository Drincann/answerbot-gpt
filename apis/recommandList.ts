export interface RecommandListParams {
  session_token?: string;
  desktop?: boolean;
  page_number?: number;
  limit?: number;
}

export interface Reason {
  reason_id: number;
  reason_type: string;
  object_token: string;
  object_type: string;
  reason_text: string;
  success_text: string;
}

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
  gender: number;
  badge: string[]; // ? string ?
  followers_count: number;
  is_following: boolean;
  is_followed: boolean;
}

export interface Question {
  id: number;
  type: 'question';
  url: string;
  title: string;
  created: number;
  answer_count: number;
  follower_count: number;
  comment_count: number;
  is_following: boolean;
  excerpt: string;
  detail: string;
  question_type: string;
  bound_topic_ids: number[];
  author: Author;
  relationship: { is_author: boolean };
}

export interface Relationship {
  is_thanked: boolean;
  is_nothelp: boolean;
  voting: number;
  upvoted_followee_ids: string[]; // ? string ?
}

export interface RecommandAnswer {
  id: number;
  type: 'answer';
  url: string;
  created_time: number;
  updated_time: number;
  voteup_count: number;
  thanks_count: number;
  comment_count: number;
  is_copyable: boolean;
  excerpt: string;
  excerpt_new: string;
  preview_type: string;
  preview_text: string;
  reshipment_settings: string;
  content: string;
  mark_infos: string[]; // ? string ?
  is_labeled: boolean;
  visited_count: number;
  favorite_count: number;
  author: Author;
  question: Question;
  relationship: Relationship[];
}

export interface RecommandListItem {
  id: string;
  type: string;
  offset: number;
  verb: string;
  created_time: number;
  updated_time: number;
  brief: string; // json string
  attached_info: string;
  action_card: boolean;
  target: RecommandAnswer;
  uninterest_reason: Reason[];
}

export interface RecommandListResponse {
  data: RecommandListItem[];
  paging: {
    previous: string;
    next: string;
    is_end: boolean;
  }
  feed_request_id: string;
}

