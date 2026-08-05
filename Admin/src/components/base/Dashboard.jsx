import React, { useContext, useEffect } from "react";
import preloader2 from "../../assets/img/preloader-2.gif";
import "./Dashboard.scss";
import AdminShell from "../../admin/shell/AdminShell";
import MainContext from "../../context/MainContext";
import { setIsConfigLoadingReducerData } from "../../redux/reducer/ChildReducer/CommonLoaderReducer";
import { setConfigReducerData } from "../../redux/reducer/ChildReducer/ConfigReducer";
import { GetApi } from "../../hooks/Get/GetApi";
import { GetConfigurationUrl } from "../../Constant/urls/urls";
import { useDispatch } from "react-redux";

const Dashboard = ({ children, setSigned, setMountLogin }) => {

  const { isInitPreLoading, isPreLoading, ShowNotification, setIsApiLoading } = useContext(MainContext);
  const dispatch = useDispatch();

  const Preloader = () => {
    return (
      <div className="preloader-section">
        <img src={preloader2} alt="Loading..." />
      </div>
    );
  };

  useEffect(() => {
    getConfiguration();
  },[]);

  /*  */
 const getConfiguration = async () => {
    setIsApiLoading(true)
    try {
      const result = await GetApi(GetConfigurationUrl);
      
      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        if (!!result.data.data) {
          dispatch(setConfigReducerData(result.data.data));
        }
      }
    } catch (error) {
      console.error("getCakeList Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    } finally {
      dispatch(setIsConfigLoadingReducerData(false));
      setIsApiLoading(false)
    }
  };

  
  
  
  return (
    <div>
      {isPreLoading && <Preloader />}

      {isInitPreLoading ? (
        <Preloader />
      ) : (
        <>
          <AdminShell setSigned={setSigned} setMountLogin={setMountLogin}>{children}</AdminShell>
        </>
      )}
    </div>
  );
};

export default Dashboard;
