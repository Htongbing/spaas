

/**
 * 获取URL中的参数
 * @param {*} name 
 */
export function getQueryString(name) {
  let reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
  let r = window.location.search.substr(1).match(reg);
  if (r != null) {
      return decodeURIComponent(r[2]);
  };
  return null;
}