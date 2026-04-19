import axios from "axios";

const baseURL = import.meta.env.VITE_PYTHON_BASE_URL;

export const pythonService = {
  convert(body, params) {
    return axios.post(`${baseURL}/convert`, body, {
      responseType: "blob",
      params: params,
    });
  },

  convertMulti(body, params) {
    return axios.post(`${baseURL}/convert-multi`, body, {
      responseType: "blob",
      params: params,
    });
  },

  download(params) {
    return axios.get(`${baseURL}/download`, {
      responseType: "blob",
      params: params,
    });
  },
};
