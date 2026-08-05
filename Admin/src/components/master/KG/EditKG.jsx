import React, { useContext, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { PostApi } from "../../../hooks/Post/PostApi";
import { GetUnitUrl, subUnitUrl } from "../../../Constant/urls/urls";
import { setUnitReducerData } from "../../../redux/reducer/ChildReducer/UnitReducer";
import {
  addKgReducerData,
  editKgReducerData,
} from "../../../redux/reducer/ChildReducer/KgReducer";
import MainContext from "../../../context/MainContext";
import { GetApi } from "../../../hooks/Get/GetApi";
import { setIsUnitLoadingReducerData } from "../../../redux/reducer/ChildReducer/CommonLoaderReducer";
import { PutApi } from "../../../hooks/Post/PutApi";
import {Drawer,Field,NotesInput,NumberInput,PrimaryButton,SecondaryButton,SelectInput} from "../../../admin/design-system";

const EditKG = ({ show, setShow, editableData, setEditableData, unitData }) => {
  const { ShowNotification } = useContext(MainContext);

  const dispatch = useDispatch();

  let isEditableDataAvail = Boolean(Object.keys(editableData).length);
  const [KgDetails, setKgDetails] = useState({
    // id: 0,
    kg: "",
    unit:"",
    description: "",
  });

  useEffect(() => {
    if (Object.keys(editableData).length) {
      setKgDetails({
        id: editableData?.id,
        kg: editableData?.kg,
        description: editableData?.description,
        unit: editableData?.unit?.id,
      });
    }
  }, [show, editableData]);

  useEffect(() => {
    getUnit()
  }, []);

  const handleClose = () => {
    setShow(false);
    setKgDetails({
      // id: 0,
      kg: "",
      unit:{},
      description: "",
    });
    setEditableData({});
  };

  const handleOnchange = (value, name) => {
    
    setKgDetails((oldData) => ({
      ...oldData,
      [name]: value,
      // id: isEditableDataAvail ? editableData.id : 0,
    }));
  };

  const hanldeUnitchange = (value) => {    
    setKgDetails((oldData) => ({
      ...oldData,
      unit: value,     
    }));
  };

  const getUnit = async () => {
    try {
      const result = await GetApi(GetUnitUrl);

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setUnitReducerData(result.data?.data));
      }
    } catch (error) {
      console.error("getKG Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    } finally {
      dispatch(setIsUnitLoadingReducerData(false));
    }
  };

  const handleCreateSubUnit = async (e) => {
    e.preventDefault();

    if (!KgDetails.kg) {
      ShowNotification("warning", "Please Enter KG");
      return;
    }

    let data = KgDetails;

    try {

      const result = await PostApi(subUnitUrl, data);

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 201) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        if (isEditableDataAvail) {
          dispatch(editKgReducerData(result.data.data));
        } else {
          dispatch(addKgReducerData(result.data.data));
          // dispatch(setUnitReducerData(result.data.data));

        }
        ShowNotification("success", result.data?.message);
        handleClose();
      }
    } catch (error) {
      console.error("Kg Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }

  };

  const handleUpdateSubUnit = async (e) => {
    
    e.preventDefault();
    if (!KgDetails.kg) {
      ShowNotification("warning", "Please Enter KG");
      return;
    }

    let data = KgDetails;

    try {

      const result = await PutApi(`${subUnitUrl}/${data?.id}`, data);

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {        
        dispatch(editKgReducerData(result.data.data));
        
        ShowNotification("success", result.data?.message);
        handleClose();

      }
    } catch (error) {
      console.error("Kg Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }

  }

  return <Drawer open={show} title={isEditableDataAvail?"Edit sub-unit":"Add sub-unit"} onClose={handleClose} footer={<><SecondaryButton onClick={handleClose}>Cancel</SecondaryButton><PrimaryButton onClick={event=>isEditableDataAvail?handleUpdateSubUnit(event):handleCreateSubUnit(event)}>{isEditableDataAvail?"Update sub-unit":"Add sub-unit"}</PrimaryButton></>}><div className="mads-form-grid"><Field label="Weight" required><NumberInput value={KgDetails.kg||""} onChange={event=>handleOnchange(event.target.value,"kg")}/></Field><Field label="Unit" required><SelectInput value={KgDetails.unit||""} onChange={event=>hanldeUnitchange(event.target.value)}><option value="">Select unit</option>{(unitData||[]).map(unit=><option key={unit.id} value={unit.id}>{unit.name}</option>)}</SelectInput></Field><Field label="Description"><NotesInput rows={4} value={KgDetails.description||""} onChange={event=>handleOnchange(event.target.value,"description")}/></Field></div></Drawer>;
};

export default EditKG;
