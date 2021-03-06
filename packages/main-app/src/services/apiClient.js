import axios from "axios";
import Vue from "vue";
import store from "@/store/index";

const skipUrls = ["easy-mock"];
const methods = ["put", "post"];

const codeMessage = {
  400: "请求有误",
  401: "没有权限",
  403: "禁止访问",
  404: "请求不存在",
  500: "服务器发生错误，请检查服务器",
  502: "网关错误。",
  503: "服务不可用",
  504: "网关超时",
};

const remindOrExit = (() => {
  let timer;
  return (error) => {
    const resp = error.response;
    const data = resp.data;

    if (resp.status === 401) {
      if (!timer) {
        Vue.$notify.error({
          title: "提示",
          message: "登陆超时，请重新登录！",
        });
        timer = setTimeout(() => {
          store.commit("LOGOUT");
        }, 2000);
      }
    } else {
      const statusCode = String(resp.status);
      const message =
        resp.status === 200
          ? data.msg
          : resp.data.msg || data.message || codeMessage[resp.status];
      // 判断http状态码或者code是否为4开头
      if (statusCode.startsWith(4) || data.code.startsWith(4)) {
        Vue.$message.error(message);
      } else {
        Vue.$notify.error({
          message,
        });
      }
    }
  };
})();

const service = {};

const reqMethods = [
  "request",
  "delete",
  "get",
  "head",
  "options", // url, config
  "post",
  "put",
  "patch", // url, data, config
];

axios.interceptors.request.use(
  function (config) {
    // Do something before request is sent
    let url = config.url;
    let method = config.method;
    // 因后端框架进行规范改造，故post，put方法query后边不传参数
    const chekoutMethod = methods.some((v) => v == method);
    if (skipUrls.some((skipUrl) => url.indexOf(skipUrl) > -1)) return;

    const token = store.state.token;
    const userData = store.state.user;

    // 只传有值的参数
    const paramsList = ["tenantId", "appId", "userId"].filter((v) => {
      return userData[v];
    });

    // post put参数
    const paramsData = paramsList.reduce((cur, pre) => {
      cur[pre] = userData[pre];
      return cur;
    }, {});

    // query参数
    const queryData = paramsList
      .map((v) => {
        return `${v}=${userData[v]}`;
      })
      .join("&");

    // jwt 验证
    if (token) {
      config.headers.common["Authorization"] = `Bearer ${token}`;
    }

    if (!chekoutMethod) {
      url += url.indexOf("?") > -1 ? "&" : "?";
      url += queryData;
    } else {
      if (!Array.isArray(config.data)) {
        config.data = {
          ...config.data,
          ...paramsData,
        };
      }
    }

    config.url = `${url}${
      url.indexOf("?") > -1 ? "&" : "?"
    }_=${new Date().getTime()}`;
    return config;
  },
  function (error) {
    remindOrExit(error);
    // Do something with request error
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  function (resp) {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Do something with response data
    const { data } = resp;
    const code = parseInt(data.code);
    // 如果code存在且不等于0，则将响应到error中
    if (code !== 0 && !Number.isNaN(code)) {
      // 如果httpStatusCode = 200, 但是操作失败的请求，将响应转为error
      // 兼容error的数据结构
      remindOrExit({ response: resp });
      return Promise.reject({ response: resp });
    }
    return Promise.resolve(resp);
  },
  function (error) {
    remindOrExit(error);
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
    return Promise.reject(error);
  }
);

reqMethods.forEach((method) => {
  service[method] = (...rest) => {
    return axios[method].apply(null, rest).then((res) => res.data);
  };
});

service.$get = service.get;
service.$post = service.post;
service.$put = service.put;
service.$delete = service.delete;

export const GET = service.get;
export const POST = service.post;
export const DELETE = service.delete;
export const PUT = service.put;

export default service;
