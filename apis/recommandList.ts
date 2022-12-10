import axios, { AxiosResponse } from "axios";
import type { RecommandParams, RecommandResponse, } from "./def.js";
import { recommandListDef } from "./def.js";

export const recommandList = async (params: RecommandParams): Promise<AxiosResponse<RecommandResponse>> => {
  return axios.request<RecommandResponse>(
    {
      ...recommandListDef,
      params,
    }
  )
}

