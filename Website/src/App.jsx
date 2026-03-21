// import { Route, Routes } from "react-router-dom";
// import AppLayout from "./layout/AppLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.scss";
import Index from "./routes";
import { useContext, useEffect, useRef } from "react";
import { DataContext } from "./context/DataContext";
import { ToastAlert } from "./component/common/ToastAlert";
import axios from "axios";
import { useLocation } from "react-router";
import { useDispatch } from "react-redux";
import { setMeta } from "./redux/reducers/ChildReducer/MetaReducer";
import { FaWhatsapp } from "react-icons/fa";
import { FiPhoneCall } from "react-icons/fi";

function App() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { REACT_APP_WHATSAPP_NUMBER } = process.env;
  const phoneNumber = REACT_APP_WHATSAPP_NUMBER ?? "919940427774";

  const { isPreloaderShow } = useContext(DataContext);

  const handleWhatsappEnquiry = () => {
    const message = `Hello 👋 I’d like to order a cake 🎂. Please share available cakes, prices, and delivery details.`;

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleCall = () => {
    window.location.href = `tel:+${phoneNumber}`;
  };



  return (
    <main className="app_container">
      <ToastAlert />
      <Index />
      {isPreloaderShow && (
        <div className="preloader-container">
          <img src={require("./assets/loader/loader-1.gif")} />
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3">
        <div
          className="text-white text-xl bg-[#2563eb] rounded-full flex justify-center items-center gap-1 px-2 py-1 h-[3rem] w-[3rem]"
          onClick={() => {
            handleCall()
          }}
        >
          <FiPhoneCall />
        </div>
        <div
          className="text-white text-xl bg-[#25d366] rounded-full flex justify-center items-center gap-1 px-2 py-1 h-[3rem] w-[3rem]"
          onClick={() => {
            handleWhatsappEnquiry()
          }}
        >
          <FaWhatsapp />
        </div>
      </div>
    </main>
  );
}

export default App;
