import { Api } from "../../Api/Api";

export const PostApi = (url, data, is_multipart) =>
  new Promise((resolve, reject) => {
    try {
      console.log("POST API URL - ",url, " is multipart - ", is_multipart);
      const headers = is_multipart
        ? { "Content-Type": "multipart/form-data" }
        : {};

      Api({
        method: "POST",
        url: url,
        data: data,
        headers: headers,
      })
        .then((response) => {
          resolve(response);
        })
        .catch((err) => {
          resolve(err.response);
        });
    } catch (error) {
      resolve(error.response);
    }
  });
