import { useState, useContext, useEffect } from "react";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, TextField } from "@mui/material";
import { Offcanvas } from "react-bootstrap";
import { useDispatch } from "react-redux";
import {
  addMainCategoryReducerData,
  editMainCategoryReducerData,
} from "../../../redux/reducer/ChildReducer/MainCategoryReducer";
import { PostApi } from "../../../hooks/Post/PostApi";
import { CreateMainCategoryUrl } from "../../../Constant/urls/urls";
import MainContext from "../../../context/MainContext";

const EditCategory = ({ show, setShow, editableData, setEditableData }) => {
  const { ShowNotification } = useContext(MainContext);
  const isEditableDataAvail = Boolean(Object.keys(editableData).length);
  const dispatch = useDispatch();

  const [cakeDetails, setCakeDetails] = useState({
    id: 0,
    name: "",
    description: "",
    meta_title: "",
    meta_description: "",
    slug: "",
    content: "",
    image: null,
  });

  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (Object.keys(editableData).length) {
      const { id, name, description, image_url,meta_title,meta_description,slug,content } = editableData;
      
      setCakeDetails({
        id: id || 0,
        name: name || "",
        description: description || "",
        meta_title: meta_title ||"",
        meta_description: meta_description ||"",
        slug: slug ||"",
        content: content ||"",
        // image: image_url || null,
      });
      setPreview(image_url || "");
    }
  }, [editableData, show]);

  const handleClose = () => {
    setShow(false);
    setCakeDetails({
      id: 0,
      name: "",
      description: "",
      image: null,
      meta_title: "",
      meta_description: "",
      slug: "",
      content: "",
    });
    setPreview("");
    setEditableData({});
  };

  const handleOnchange = (value, name) => {
    if (name === "image") {
      setCakeDetails((oldData) => ({
        ...oldData,
        [name]: value,
      }));
      setPreview(URL.createObjectURL(value));
    } else {
      setCakeDetails((oldData) => ({
        ...oldData,
        [name]: value,
        id: isEditableDataAvail ? editableData.id : 0,
      }));
    }
  };

  const handleAddMainCategory = async () => {
    const formData = new FormData();

    if (!cakeDetails.name) {
      ShowNotification("warning", "Please Enter Category name");
      return;
    }
    if (!cakeDetails.image && !cakeDetails?.id) {
      ShowNotification("warning", "Please Select Image");
      return;
    }
    
    if (Object.keys(editableData).length) {
      formData.append("id", cakeDetails?.id);
    }
    formData.append("name", cakeDetails.name);
    formData.append("description", cakeDetails.description);
    formData.append("meta_title", cakeDetails.meta_title);
    formData.append("meta_description", cakeDetails.meta_description);
    formData.append("slug", cakeDetails.slug);
    formData.append("content", cakeDetails.content);

    if (cakeDetails.image) {
      formData.append("image", cakeDetails.image);
    }
    try {
      const result = await PostApi(CreateMainCategoryUrl, formData, true);

      // if (result.status !== 200) {
      //   ShowNotification("error", result.data.message);
      //   return;
      // }

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        if (isEditableDataAvail) {
          dispatch(editMainCategoryReducerData(result.data?.data));
        } else {
          dispatch(addMainCategoryReducerData(result.data?.data));
        }
        ShowNotification("success", result.data?.message);
      }
    } catch (error) {
      console.error("post category Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }

    handleClose();
  };

  return (
    <>
      <div>
        <Offcanvas
          className="cgm-expiry-user-action-modal"
          show={show}
          onHide={handleClose}
          placement={"end"}
        >
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>
              {isEditableDataAvail ? "Edit Main Category" : "Add Main Category"}
            </Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            <TextField
              id="category-name"
              className="my-2"
              label="Category Name"
              fullWidth
              size="small"
              required
              value={cakeDetails.name || ""}
              onChange={(e) => {
                handleOnchange(e.target.value, "name");
              }}
            />
            <TextField
              id="category-description"
              className="my-2"
              label="Category Description"
              multiline
              rows={3}
              fullWidth
              size="small"
              required
              value={cakeDetails.description || ""}
              onChange={(e) => {
                handleOnchange(e.target.value, "description");
              }}
            />
            <TextField
              id="meta_title"
              className="my-2"
              label="Meta Title"
              fullWidth
              size="small"
              required
              value={cakeDetails.meta_title || ""}
              onChange={(e) => {
                handleOnchange(e.target.value, "meta_title");
              }}
            />
            <TextField
              id="meta_description"
              className="my-2"
              label="Meta Description"
              multiline
              rows={3}
              fullWidth
              size="small"
              required
              value={cakeDetails.meta_description || ""}
              onChange={(e) => {
                handleOnchange(e.target.value, "meta_description");
              }}
            />
            <TextField
              id="slug"
              className="my-2"
              label="Slug"
              fullWidth
              size="small"
              required
              value={cakeDetails.slug || ""}
              onChange={(e) => {
                handleOnchange(e.target.value, "slug");
              }}
            />
            <TextField
              id="content"
              className="my-2"
              label="Content"
              multiline
              rows={3}
              fullWidth
              size="small"
              required
              value={cakeDetails.content || ""}
              onChange={(e) => {
                handleOnchange(e.target.value, "content");
              }}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                handleOnchange(e.target.files[0], "image");
              }}
            />
            {preview && (
              <div className="mt-2">
                <img
                  src={preview}
                  alt="Preview"
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "10px",
                    objectFit: 'cover'
                  }}
                />
              </div>
            )}
            <div className="text-end">
              <Button
                variant="contained"
                color="primary"
                size="small"
                style={{
                  textTransform: "none",
                  borderRadius: "5px",
                }}
                onClick={(e) => {
                  handleAddMainCategory();
                }}
              >
                <FontAwesomeIcon icon={faPlus} className="mx-1" />
                {isEditableDataAvail
                  ? "Edit Main Category"
                  : "Add Main Category"}
              </Button>
            </div>
          </Offcanvas.Body>
        </Offcanvas>
      </div>
    </>
  );
};

export default EditCategory;
