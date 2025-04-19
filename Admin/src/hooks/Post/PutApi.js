import { Api } from "../../Api/Api";

export const PutApi = (url, data, is_multipart = false) =>
  new Promise((resolve, reject) => {
    try {
      const headers = is_multipart
        ? { "Content-Type": "multipart/form-data" }
        : {};

      Api({
        method: "PUT",
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
