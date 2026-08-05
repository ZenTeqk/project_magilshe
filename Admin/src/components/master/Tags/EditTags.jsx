import React, { useContext, useEffect, useState } from "react";
import MainContext from "../../../context/MainContext";
import { useDispatch } from "react-redux";
import { CreateTgUrl } from "../../../Constant/urls/urls";
import {
  addTaglistReducerData,
  editTaglistReducerData,
} from "../../../redux/reducer/ChildReducer/TagListReducer";
import { PostApi } from "../../../hooks/Post/PostApi";
import {Drawer,Field,PrimaryButton,SecondaryButton,TextInput} from "../../../admin/design-system";

const EditTags = ({ show, setShow, editableData, setEditableData }) => {
  const { ShowNotification } = useContext(MainContext);
  const dispatch = useDispatch();
  // const { tag_list_reducer_data } = useSelector(
  //   (state) => state.TaglistReducer
  // );

  let isEditableDataAvail = Boolean(Object.keys(editableData).length);

  const [tagDetails, setTagDetails] = useState({
    id: 0,
    tag: "",
  });

  useEffect(() => {
    if (Object.keys(editableData).length) {
      setTagDetails(editableData);
    }
  }, [show, editableData]);

  const handleClose = () => {
    setShow(false);
    setTagDetails({
      id: 0,
      tag: "",
    });
    setEditableData({});
  };

  const handleOnchange = (value, name) => {
    setTagDetails((oldData) => ({
      ...oldData,
      [name]: value,
      id: isEditableDataAvail ? editableData.id : 0,
    }));
  };

  const handleAddTag = async (e) => {
    e.preventDefault();

    if (!tagDetails.tag) {
      ShowNotification("warning", "Enter Tag Name");
      return;
    }
    let data = isEditableDataAvail ? tagDetails : { tag: tagDetails?.tag };

    try {
      const result = await PostApi(CreateTgUrl, data);

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        if (isEditableDataAvail) {
          ShowNotification("success", result.data?.message);
          dispatch(editTaglistReducerData(result.data?.data));
        } else {
          ShowNotification("success", result.data?.message);
          dispatch(addTaglistReducerData(result.data.data));
        }
      }
    } catch (error) {
      console.error("tag Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }

    handleClose();
  };

  return <Drawer open={show} title={isEditableDataAvail?"Edit tag":"Add tag"} onClose={handleClose} footer={<><SecondaryButton onClick={handleClose}>Cancel</SecondaryButton><PrimaryButton onClick={handleAddTag}>{isEditableDataAvail?"Update tag":"Add tag"}</PrimaryButton></>}><Field label="Tag name" required><TextInput value={tagDetails.tag||""} onChange={event=>handleOnchange(event.target.value,"tag")}/></Field></Drawer>;
};

export default EditTags;
