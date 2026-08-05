import React, { useContext, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { PostApi } from "../../../hooks/Post/PostApi";
import { UpdateUnitUrl } from "../../../Constant/urls/urls";
import {
  addUnitReducerData,
  editUnitReducerData,
} from "../../../redux/reducer/ChildReducer/UnitReducer";
import MainContext from "../../../context/MainContext";
import {Drawer,Field,NotesInput,PrimaryButton,SecondaryButton,TextInput} from "../../../admin/design-system";

const EditUnit = ({ show, setShow, editableData, setEditableData }) => {
  const { ShowNotification, setIsApiLoading } = useContext(MainContext);
  const dispatch = useDispatch();

  let isEditableDataAvail = Boolean(Object.keys(editableData).length);
  const [unitDetails, setUnitDetails] = useState({
    id: 0,
    name: "",
    description: "",
  });
  useEffect(() => {
    if (Object.keys(editableData).length) {
      setUnitDetails(editableData);
    }
  }, [show, editableData]);
  const handleClose = () => {
    setShow(false);
    setUnitDetails({
      id: 0,
      name: "",
      description: "",
    });
    setEditableData({});
  };

  const handleOnchange = (value, name) => {
    setUnitDetails((oldData) => ({
      ...oldData,
      [name]: value,
      id: isEditableDataAvail ? editableData.id : 0,
    }));
  };

  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!unitDetails.name) {
      ShowNotification("warning", "Please Enter Unit");
      return;
    }
    setIsApiLoading(true)

    let data = isEditableDataAvail
      ? unitDetails
      : { name: unitDetails?.name, description: unitDetails.description };

    try {
      const result = await PostApi(UpdateUnitUrl, data);

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        if (isEditableDataAvail) {
          dispatch(editUnitReducerData(result.data.data));
        } else {
          dispatch(addUnitReducerData(result.data.data));
        }
        ShowNotification("success", result.data?.message);
      }
    } catch (error) {
      console.error("Unit Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    } finally{
      setIsApiLoading(false)
    }

    handleClose();
  };

  return <Drawer open={show} title={isEditableDataAvail?"Edit unit":"Add unit"} onClose={handleClose} footer={<><SecondaryButton onClick={handleClose}>Cancel</SecondaryButton><PrimaryButton onClick={handleAddUnit}>{isEditableDataAvail?"Update unit":"Add unit"}</PrimaryButton></>}><div className="mads-form-grid"><Field label="Unit name" required><TextInput value={unitDetails.name||""} onChange={event=>handleOnchange(event.target.value,"name")}/></Field><Field label="Description"><NotesInput rows={4} value={unitDetails.description||""} onChange={event=>handleOnchange(event.target.value,"description")}/></Field></div></Drawer>;
};

export default EditUnit;
