import { Api } from "../../Api/Api";

export const DeleteApi = (url) =>
  new Promise((resolve, reject) => {
    try {
      Api({
        method: "DELETE",
        url: url,
      })
        .then((response) => {
          resolve(response);
        })
        .catch((err) => {
          console.error("GetResponse Catch Error ===", err.response);
        });
    } catch (error) {
      console.error("GetResponse Error ===", error);
      reject(error.response);
    }
  });
