import React, { useContext, useState } from "react";
import { checkCustomer, ManualOrderCustomerUrl } from "../../Constant/urls/urls";
import {
  addCustomersReducerData,
  setCustomersReducerData,
} from "../../redux/reducer/ChildReducer/CustomersReducer";
import { useDispatch } from "react-redux";
import MainContext from "../../context/MainContext";
import { PostApi } from "../../hooks/Post/PostApi";
import { Field, Modal, NotesInput, PhoneInput, PrimaryButton, SecondaryButton, TextInput } from "../../admin/design-system";

const AddNewCustomerModal = ({ open, setModalOpen, onSubmit }) => {
  const dispatch = useDispatch();
  const { ShowNotification, setIsPreLoading } = useContext(MainContext);

  const [formData, setFormData] = useState({
    phone: "",
    name: "",
    email: "",
    address: "",
    city: "",
    pincode: "",
  });

  const [customerID, setCustomerId] = useState(0);

  const handleClose = () => {
    setModalOpen(false);
    setIsDoneSearch(false)
  }

  const [isDoneSearch, setIsDoneSearch] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const emptyFields = Object.entries(formData).filter(
      ([key, value]) => !value?.trim()
    );

    if (emptyFields.length > 0) {
      const missingFields = emptyFields.map(([key]) => key).join(", ");
      ShowNotification(
        "error",
        `Please fill the following fields: ${missingFields}`
      );
      return;
    }

    try {
      const payload = {
        phone: formData.phone,
        name: formData.name,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        pincode: formData.pincode,
      };



      const result = await PostApi(ManualOrderCustomerUrl, payload);

      if (result.status === 200) {
        ShowNotification("success", "Customer added successfully");
        setFormData({
          phone: "",
          name: "",
          email: "",
          address: "",
          city: "",
          pincode: "",
        });

        const customerData = result.data.data;
        const addressDetailsId = customerData.address_details?.[0]?.id;
        const customerId = customerData.id;

        if (typeof onSubmit === "function") {
          onSubmit({
            name: formData.name,
            addressDetailsId,
            customerId,
            phone: formData.phone,
            email: formData.email,
          });
        }

        dispatch(addCustomersReducerData(result.data.data));
      } else {
        ShowNotification("error", result.data?.message || "An error occurred");
      }
    } catch (error) {
      console.error("handleSubmit Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
  };

  const handleCheckUser = async () => {
    try {
      setIsPreLoading(true)
      const payload = {
        phone: formData.phone,
      };
      const result = await PostApi(checkCustomer, payload);

      let response = (result?.data?.data);

      if (response?.address_details) {
        setFormData((prev) => ({
          ...prev,
          name: response?.name,
          email: response?.email,
        }));

        const customerData = response;
        const addressDetailsId = customerData.address_details?.[0]?.id;
        const customerId = customerData.id;

        if (typeof onSubmit === "function") {
          onSubmit({
            name: response.name,
            addressDetailsId,
            customerId,
            phone: response.phone,
            email: response.email,
          });
        }

        dispatch(addCustomersReducerData(customerData));
      } else {
        const customerData = response;
        // const customerId = customerData?.id || null;
        setFormData((prev) => ({
          ...prev,
          name: response?.name,
          email: response?.email,
        }));

        if (customerData?.id) {
          payload.customer_id = formData?.customer_id
        }

      }

      setIsDoneSearch(true)

    } catch (error) {
      console.error("handleSubmit Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
    finally {
      setIsPreLoading(false)
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add new customer" footer={<><SecondaryButton onClick={handleClose}>Cancel</SecondaryButton><PrimaryButton onClick={handleSubmit}>Add customer</PrimaryButton></>}>
        <Field label="Phone number" required helperText="Check the phone number before entering a new customer."><PhoneInput name="phone" value={formData.phone} onChange={handleChange} disabled={isDoneSearch}/></Field>
        <div className="mads-inline-actions">
          <SecondaryButton onClick={() => {
              setIsDoneSearch(false);
              setFormData((prev) => ({
                ...prev,
                name: "",
                email: "",
                address: "",
                city: "",
                pincode: "",
              }));
            }}>Edit phone</SecondaryButton>
          <SecondaryButton onClick={handleCheckUser}>Check customer</SecondaryButton>
        </div>

        {isDoneSearch && (
          <>
            <Field label="Name" required><TextInput name="name" value={formData.name} onChange={handleChange}/></Field>
            <Field label="Email"><input type="email" name="email" value={formData.email} onChange={handleChange}/></Field>
            <Field label="Address"><NotesInput name="address" value={formData.address} onChange={handleChange}/></Field>
            <Field label="City"><TextInput name="city" value={formData.city} onChange={handleChange}/></Field>
            <Field label="Pincode"><TextInput name="pincode" inputMode="numeric" value={formData.pincode} onChange={handleChange}/></Field>
          </>
        )}
    </Modal>
  );
};

export default AddNewCustomerModal;
