import React, { useContext, useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { useDispatch, useSelector } from "react-redux";
import MainContext from "../../context/MainContext";
import PreLoaderComponent from "../../common/PreLoaderComponent";
import { GetApi } from "../../hooks/Get/GetApi";
import { PostApi } from "../../hooks/Post/PostApi";
import { DeleteApi } from "../../hooks/Delete/DeleteApi";
import { FeedBackUrl } from "../../Constant/urls/urls";
import { setFeedBackReducerData } from "../../redux/reducer/ChildReducer/FeedBackReducer";
import { setIsFeedbackLoadingReducerData } from "../../redux/reducer/ChildReducer/CommonLoaderReducer";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Switch,
  FormControlLabel,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";

const FeedBack = () => {
  const { ShowNotification } = useContext(MainContext);

  // Reducer Data
  const { feedback_reducer_data } = useSelector(
    (state) => state.FeedBackReducer
  );
  const { is_feedback_loading } = useSelector(
    (state) => state.CommonLoaderReducer
  );
  const dispatch = useDispatch();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editableData, setEditableData] = useState({
    id: "",
    name: "",
    mobile: "",
    message: "",
    status: false,
    is_subscribed: false,
  });

  useEffect(() => {
    getFeecBack();
  }, []);

  const categoryDTColumns = [
    {
      name: "ID",
      selector: (row) => row?.id,
      width: "5%",
    },
    {
      name: "Name",
      selector: (row) => row?.name,
      width: "15%",
    },
    {
      name: "Mobile",
      selector: (row) => row?.mobile,
      width: "10%",
    },
    {
      name: "Status",
      selector: (row) => String(row?.status),
      width: "15%",
    },
    {
      name: "Is_Subscribed",
      selector: (row) => String(row?.is_subscribed),
      width: "15%",
    },
    {
      name: "Message",
      selector: (row) => row?.message,
      minWidth: "30%",
    },
    {
      name: "Actions",
      cell: (row) => (
        <>
          <EditIcon
            style={{ cursor: "pointer", marginRight: "10px" }}
            onClick={() => handleEdit(row)}
          />
          <DeleteIcon
            style={{ cursor: "pointer", color: "red" }}
            onClick={() => handleDelete(row?.id)}
          />
        </>
      ),
      width: "15%",
    },
  ];

  const getFeecBack = async () => {
    try {
      const result = await GetApi(FeedBackUrl);
      
      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setFeedBackReducerData(result.data?.data));
      }
    } catch (error) {
      console.error("getFeecBack Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    } finally {
      dispatch(setIsFeedbackLoadingReducerData(false));
    }
  };

  const handleSave = async () => {
    try {
      const result = await PostApi(FeedBackUrl, editableData);
      if (result.status === 200) {
        ShowNotification("success", "Feedback saved successfully");
        getFeecBack();
        handleCloseDialog();
      } else {
        ShowNotification("error", result.data?.message || "Failed to save feedback");
      }
    } catch (error) {
      console.error("handleSave Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
  };

  const handleEdit = (row) => {
    
    setEditableData({
      id: row?.id,
      name: row?.name,
      mobile: row?.mobile,
      message: row?.message,
      status: row?.status,
      is_subscribed: row?.is_subscribed,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      const result = await DeleteApi(`${FeedBackUrl}/${id}`);
      if (result.status === 200) {
        ShowNotification("success", "Feedback deleted successfully");
        getFeecBack(); // Refresh the feedback list after deletion
      } else {
        ShowNotification("error", result.data?.message || "Failed to delete feedback");
      }
    } catch (error) {
      console.error("handleDelete Error:", error);
      ShowNotification("error", "An unexpected error occurred while deleting feedback");
    }
  };
  

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditableData({
      id: 0,
      name: "",
      mobile: "",
      message: "",
      status: false,
      is_subscribed: false,
    });
  };

  if (is_feedback_loading) {
    return <PreLoaderComponent />;
  }

  return (
    <div className="cgm-purchase-section">
      <div className="mb-3 text-end">
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Feedback
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<RefreshIcon />}
          onClick={getFeecBack}
          style={{ marginLeft: "10px" }}
        >
          Refresh
        </Button>
      </div>

      <div className={`dt-table`}>
        <DataTable
          columns={categoryDTColumns}
          striped
          data={feedback_reducer_data}
          className="dt-table-container"
          pagination
        />
      </div>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editableData?.id ? "Edit Feedback" : "Add Feedback"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="dense"
            value={editableData.name}
            onChange={(e) =>
              setEditableData({ ...editableData, name: e.target.value })
            }
          />
          <TextField
            label="Mobile"
            fullWidth
            margin="dense"
            value={editableData.mobile}
            onChange={(e) =>
              setEditableData({ ...editableData, mobile: e.target.value })
            }
          />
          <TextField
            label="Message"
            fullWidth
            margin="dense"
            multiline
            rows={4}
            value={editableData.message}
            onChange={(e) =>
              setEditableData({ ...editableData, message: e.target.value })
            }
          />
          <FormControlLabel
            control={
              <Switch
                checked={editableData.status}
                onChange={(e) =>
                  setEditableData({ ...editableData, status: e.target.checked })
                }
              />
            }
            label="Status"
          />
          <FormControlLabel
            control={
              <Switch
                checked={editableData.is_subscribed}
                onChange={(e) =>
                  setEditableData({
                    ...editableData,
                    is_subscribed: e.target.checked,
                  })
                }
              />
            }
            label="Subscribed"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSave} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default FeedBack;
