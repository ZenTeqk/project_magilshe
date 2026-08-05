import { useState, useContext, useEffect } from "react";
import { useDispatch } from "react-redux";
import { PostApi } from "../../hooks/Post/PostApi";
import {CreateDeliveryPersonUrl} from "../../Constant/urls/urls";
import MainContext from "../../context/MainContext";
import {
  addDeliveryPersonReducerData,
  editDeliveryPersonReducerData,
} from "../../redux/reducer/ChildReducer/DeliveryPersonReducer";
import {DateInput,Drawer,Field,NotesInput,PhoneInput,PrimaryButton,SecondaryButton,TextInput} from "../../admin/design-system";

const EditDeliveryPerson = ({
  show,
  setShow,
  editableData,
  setEditableData,
}) => {
  const { ShowNotification } = useContext(MainContext);
  const isEditableDataAvail = Boolean(Object.keys(editableData).length);
  const dispatch = useDispatch();

  const [deliveryPersonDetails, setDeliveryPersonDetails] = useState({
    id: 0,
    name: "",
    phone: "",
    email: "",
    address: "",
    dob: "",
    image: null,
  });

  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (Object.keys(editableData).length) {
      const { id, name, phone, email, address, dob, image_url } = editableData;
      
      setDeliveryPersonDetails({
        id: id || 0,
        name: name || "",
        phone: phone || "",
        email: email || "",
        address: address || "",
        dob: dob || "",
        image: null,
      });
      setPreview(image_url || "");
    }
  }, [editableData, show]);

  const handleClose = () => {
    setShow(false);
    setDeliveryPersonDetails({
      id: 0,
      name: "",
      phone: "",
      email: "",
      address: "",
      dob: "",
      image: null,
    });
    setPreview("");
    setEditableData({});
  };

  const handleOnchange = (value, name) => {
    if (name === "image") {
      setDeliveryPersonDetails((oldData) => ({
        ...oldData,
        [name]: value,
      }));
      setPreview(URL.createObjectURL(value));
    } else {
      setDeliveryPersonDetails((oldData) => ({
        ...oldData,
        [name]: value,
        id: isEditableDataAvail ? editableData.id : 0,
      }));
    }
  };

  const handleAddDeliveryPerson = async () => {
    const formData = new FormData();
    if (!deliveryPersonDetails.name) {
      ShowNotification("warning", "Please Enter Person name");
      return;
    }
    if (!deliveryPersonDetails.phone) {
      ShowNotification("warning", "Please Enter Mobile Number");
      return;
    }
    if (!deliveryPersonDetails.email) {
      ShowNotification("warning", "Please Enter Email Address");
      return;
    }
    if (!deliveryPersonDetails.dob) {
      ShowNotification("warning", "Please Enter Date Of Birth");
      return;
    }
    if (!deliveryPersonDetails.address) {
      ShowNotification("warning", "Please Enter Address");
      return;
    }
    if (isEditableDataAvail) {
      formData.append("id", deliveryPersonDetails?.id);
    }
    
    formData.append("name", deliveryPersonDetails.name);
    formData.append("phone", deliveryPersonDetails.phone);
    formData.append("email", deliveryPersonDetails.email);
    formData.append("dob", deliveryPersonDetails.dob);
    formData.append("address", deliveryPersonDetails.address);
    if (deliveryPersonDetails.image) {
      formData.append("image", deliveryPersonDetails.image);
    }
    try {
      const result = await PostApi(CreateDeliveryPersonUrl, formData, true);

      
      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        if (isEditableDataAvail) {
          dispatch(editDeliveryPersonReducerData(result.data?.data));
        } else {
          dispatch(addDeliveryPersonReducerData(result.data?.data));
        }
        ShowNotification("success", result.data?.message);
        handleClose();

      }
    } catch (error) {
      console.error("post category Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }

    
  };

  return <Drawer open={show} title={isEditableDataAvail?"Edit delivery person":"Add delivery person"} onClose={handleClose} footer={<><SecondaryButton onClick={handleClose}>Cancel</SecondaryButton><PrimaryButton onClick={handleAddDeliveryPerson}>{isEditableDataAvail?"Update delivery person":"Add delivery person"}</PrimaryButton></>}><div className="mads-form-grid"><Field label="Name" required><TextInput value={deliveryPersonDetails.name||""} onChange={event=>handleOnchange(event.target.value,"name")}/></Field><Field label="Mobile number" required><PhoneInput value={deliveryPersonDetails.phone||""} onChange={event=>handleOnchange(event.target.value,"phone")}/></Field><Field label="Email" required><input type="email" value={deliveryPersonDetails.email||""} onChange={event=>handleOnchange(event.target.value,"email")}/></Field><Field label="Date of birth" required><DateInput value={deliveryPersonDetails.dob||""} onChange={event=>handleOnchange(event.target.value,"dob")}/></Field><Field label="Address" required><NotesInput rows={3} value={deliveryPersonDetails.address||""} onChange={event=>handleOnchange(event.target.value,"address")}/></Field><Field label="Photo"><input type="file" accept="image/*" onChange={event=>handleOnchange(event.target.files[0],"image")}/></Field>{preview&&<img className="mads-management-image-preview" src={preview} alt="Delivery person preview"/>}</div></Drawer>;
};

export default EditDeliveryPerson;
