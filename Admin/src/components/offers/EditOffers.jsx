import React, { useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import MainContext from "../../context/MainContext";
import { PostApi } from "../../hooks/Post/PostApi";
import { CreateOfferUrl } from "../../Constant/urls/urls";
import {
  addOffersReducerData,
  editOffersReducerData,
} from "../../redux/reducer/ChildReducer/OffersReducer";
import { ConvertDateTimeStrFunction } from "../../commonFunctions";
import {Drawer,Field,NumberInput,PrimaryButton,SecondaryButton,TextInput} from "../../admin/design-system";

const EditOffers = ({ show, setShow, editableData, setEditableData }) => {
  const { ShowNotification } = useContext(MainContext);
  const dispatch = useDispatch();
  const { cake_list_reducer_data } = useSelector(
    (state) => state.CakeListReducer
  );

  let isEditableDataAvail = Boolean(Object.keys(editableData).length);

  const [offerDetails, setOfferDetails] = useState({
    id: 0,
    type: 3,
    id_list: {},
    name: "",
    offer_per: 0,
    offer_from: "",
    offer_to: "",
    image: {},
  });

  const [selectedCakes, setSelectedCakes] = useState([]);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (Object.keys(editableData).length) {

      setOfferDetails({
        ...editableData,
        id_list: editableData?.id_list||[],
      });
      if (editableData?.url) {
        setPreview(editableData?.url);
      } else {
        setPreview("");
      }
      setSelectedCakes(editableData?.cake_list||[])
    } else {
      const formattedDateTime = new Date().toISOString().slice(0, 16);
      setOfferDetails((prevDetails) => ({
        ...prevDetails,
        offer_to: formattedDateTime,
        offer_from: formattedDateTime
      }));
    }
  }, [show, editableData]);


  useEffect(() => {
    const filteredData = cake_list_reducer_data.filter((val) =>
      selectedCakes.includes(val.id)
    );
    const mappedData = filteredData.flatMap((val) =>
      val.price_list.map((obj) => obj.id)
    );
    const mappedObj = (mappedData);

    setOfferDetails((oldData) => ({
      ...oldData,
      id_list: mappedObj,
    }));
  }, [cake_list_reducer_data,selectedCakes]);

  useEffect(() => {
    if (offerDetails.offer_from) {
      const formattedDateString = ConvertDateTimeStrFunction(
        offerDetails.offer_from
      );
      setOfferDetails((oldData) => ({
        ...oldData,
        offer_from: formattedDateString,
      }));
    }
  }, [offerDetails.offer_from]);
  useEffect(() => {
    if (offerDetails.offer_to) {
      const formattedDateString = ConvertDateTimeStrFunction(
        offerDetails.offer_to
      );

      setOfferDetails((oldData) => ({
        ...oldData,
        offer_to: formattedDateString,
      }));
    }
  }, [offerDetails.offer_to]);

  const handleClose = () => {
    setShow(false);
    setOfferDetails({
      id: 0,
      type: 3,
      id_list: {},
      name: "",
      offer_per: 0,
      offer_from: "",
      offer_to: "",
    });
    setSelectedCakes([]);
    setEditableData({});
  };

  const handleOnchange = (value, name) => {
    if (name === "offer_per" && value > 99.9) {
      return; // Stop execution if the value is greater than 100
    }

    if (name === "image") {
      setPreview(URL.createObjectURL(value));
      setOfferDetails((oldData) => ({
        ...oldData,
        image: value,
      }));
    } else {
      setOfferDetails((oldData) => ({
        ...oldData,
        [name]: value,
        id: isEditableDataAvail ? editableData.id : 0,
      }));
    }
  };

  const handleCakeList = (e) => setSelectedCakes(Array.from(e.target.selectedOptions,option=>Number(option.value)));

  const handleOffer = async (e) => {
    e.preventDefault();

    if (!offerDetails.name) {
      ShowNotification("warning", "Please Enter Offer Name");
      return;
    }
    if (!offerDetails.offer_from) {
      ShowNotification("warning", "Please Enter Offer from Date");
      return;
    }
    if (!offerDetails.offer_to) {
      ShowNotification("warning", "Please Enter Offer end Date");
      return;
    }
    if (!offerDetails.offer_per) {
      ShowNotification("warning", "Please Enter Offer Percentage");
      return;
    }

    const formData = new FormData();

    if (isEditableDataAvail) {
      formData.append("id", offerDetails.id);
    } else {
      formData.append("id", 0);
    }
    formData.append("type", 3);
    formData.append("id_list", offerDetails.id_list);
    formData.append("name", offerDetails.name);
    formData.append("offer_per", offerDetails.offer_per);
    formData.append("offer_from", offerDetails.offer_from);
    formData.append("offer_to", offerDetails.offer_to);
    if (offerDetails.image) {
      formData.append("image", offerDetails.image);
    }

    try {
      const result = await PostApi(CreateOfferUrl, formData);
      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        if (isEditableDataAvail) {
          ShowNotification("success", result.data?.message);
          dispatch(editOffersReducerData(result.data?.data));
        } else {
          ShowNotification("success", result.data?.message);
          dispatch(addOffersReducerData(result.data.data));
        }
      }
      handleClose();
    } catch (error) {
      console.error("offer Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }

    
  };
  return <Drawer open={show} title={isEditableDataAvail?"Edit offer":"Add offer"} onClose={handleClose} footer={<><SecondaryButton onClick={handleClose}>Cancel</SecondaryButton><PrimaryButton onClick={handleOffer}>{isEditableDataAvail?"Update offer":"Add offer"}</PrimaryButton></>}><div className="mads-form-grid"><Field label="Offer name" required><TextInput value={offerDetails.name||""} onChange={event=>handleOnchange(event.target.value,"name")}/></Field><Field label="Offer starts" required span={6}><TextInput type="datetime-local" value={offerDetails.offer_from||""} onChange={event=>handleOnchange(event.target.value,"offer_from")}/></Field><Field label="Offer ends" required span={6}><TextInput type="datetime-local" value={offerDetails.offer_to||""} onChange={event=>handleOnchange(event.target.value,"offer_to")}/></Field><Field label="Discount percentage" required span={6}><NumberInput min="0" max="99.9" step="0.1" value={offerDetails.offer_per||""} onChange={event=>handleOnchange(event.target.value,"offer_per")}/></Field><Field label="Offered products" span={6} helperText="Hold Ctrl or Command to select multiple products."><select className="mads-input" multiple value={selectedCakes} onChange={handleCakeList}>{(cake_list_reducer_data||[]).map(product=><option key={product.id} value={product.id}>{product.name}</option>)}</select></Field><Field label="Offer image"><input type="file" accept="image/*" onChange={event=>handleOnchange(event.target.files[0],"image")}/></Field>{preview&&<img className="mads-management-image-preview" src={preview} alt="Offer preview"/>}</div></Drawer>;
};

export default EditOffers;
