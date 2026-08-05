import {
  faEdit,
  faRefresh,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useContext, useEffect, useState } from "react";
import EditCategory from "./EditCategory";
import { GetApi } from "../../../hooks/Get/GetApi";
import MainContext from "../../../context/MainContext";
import { GetMainCategoryUrl } from "../../../Constant/urls/urls";
import { useDispatch, useSelector } from "react-redux";
import { setMainCategoryReducerData } from "../../../redux/reducer/ChildReducer/MainCategoryReducer";
import { setIsCategoryLoadingReducerData } from "../../../redux/reducer/ChildReducer/CommonLoaderReducer";
import {IconButton,ManagementPage,ManagementTable,PrimaryButton,SecondaryButton} from "../../../admin/design-system";

const Category = () => {
  const dispatch = useDispatch();
  const { ShowNotification } = useContext(MainContext);

  //reducer Data
  const { main_category_reducer_data } = useSelector(
    (state) => state.MainCategoryReducer
  );
  const { is_category_loading } = useSelector(
    (state) => state.CommonLoaderReducer
  );

  const [show, setShow] = useState(false);
  const [editableData, setEditableData] = useState({});

  useEffect(() => {
    getCategories();
  }, []);

  const categoryDTColumns = [
    {
      name: "ID",
      selector: (row) => row?.id,
      width: "10%",
    },
    {
      name: "Category Name",
      selector: (row) => row?.name,
      width: "25%",
    },
    {
      name: "Category Image",
      selector: (row) => row?.image_url,
      width: "25%",
      cell: (row) => (
        <div className="text-center">
          <img
            src={row?.image_url}
            alt="category"
            className="category-image"
            style={{
              width: "40px",
              height: "40px",
              objectFit: "cover",
              borderRadius: "50%",
            }}
          />
        </div>
      ),
    },
    {
      name: "Action",
      minWidth: "10%",
      cell: (row) => (
        <div className="text-center">
          <IconButton label={`Edit ${row?.name||"category"}`}
            onClick={() => {
              setShow(true);
              setEditableData(row);
            }}
          >
            <FontAwesomeIcon icon={faEdit}/>
          </IconButton>
        </div>
      ),
    },
  ];

  const getCategories = async () => {
    try {
      const result = await GetApi(GetMainCategoryUrl);
      
      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setMainCategoryReducerData(result.data.data));
      }
    } catch (error) {
      console.error("getCategories Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    } finally {
      dispatch(setIsCategoryLoadingReducerData(false));
    }
  };

  return (
    <ManagementPage title="Cake Categories" description="Organize products into customer-facing catalogue categories." primaryAction={<PrimaryButton icon={<FontAwesomeIcon icon={faPlus}/>} onClick={()=>setShow(true)}>Add category</PrimaryButton>} secondaryActions={<SecondaryButton icon={<FontAwesomeIcon icon={faRefresh}/>} onClick={getCategories}>Refresh</SecondaryButton>}>
      <ManagementTable title="Categories" description="Edit an existing category or add a new one." columns={categoryDTColumns} rows={main_category_reducer_data||[]} loading={is_category_loading} emptyTitle="No cake categories"/>

      <EditCategory
        show={show}
        setShow={setShow}
        editableData={editableData}
        setEditableData={setEditableData}
      />
    </ManagementPage>
  );
};

export default Category;
