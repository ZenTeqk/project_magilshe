import React, { createContext, useEffect, useState } from 'react';
import PropTypes from "prop-types";
import { getAddressApi, getOrderApi, getOverallCakeMenuList, getSubCategoryListApi, getOfferItemsApi, getConfiguration, getProfileApi, getOfferPageApi, getMainCategoryListApi } from '../utils/cakeryAPI';
import Cookies from 'universal-cookie';
import { useLocation } from 'react-router-dom';
import { meta_paths } from '../component/Meta/MetaPaths';

// Create a Context
export const DataContext = createContext();

// Create a Provider component
export const DataProvider = ({ children }) => {

    const location = useLocation();

    const [isPreloaderShow, setIsPreloaderShow] = useState(false); // Initial state

    /* InitState Loader */
    const [initPageGallery, setInitPageGallery] = useState(true);
    const [initPageMenuList, setInitPageMenuList] = useState(true);
    const [initPageOffer, setInitPageOffer] = useState(true);

    /* End-InitState Loader  */
    const [data, setData] = useState({}); // Initial state
    const [customerAddressObj, setCustomerAddressObj] = useState([]);
    const [accessToken, setAccessToken] = useState('')

    const [menuListObj, setMenuListObj] = useState([]);

    const [cakeObj, setCakeObj] = useState([]);
    const [offeredItemsObj, setOfferedItemsObj] = useState([]);
    const [offeredPageItemsObj, setOfferedPageItemsObj] = useState([]);
    const [favouriteCakeObj, setFavouriteCakeObj] = useState([]);
    const [recommendedCakeObj, setRecommendedCakeObj] = useState([]);

    const [featuredCategoriesObj, setFeaturedCategoriesObj] = useState([]);
    const [mainCategoriesObj, setMainCategoriesObj] = useState([]);
    const [subCategoriesObj, setSubCategoriesObj] = useState([]);

    const [galleryImageObj, setGalleryImageObj] = useState([]);
    const [cakeListApi, setCakeListApi] = useState([]);
    const [offerApi, setOfferApi] = useState([]);
    const [myOrdersList, setMyOrdersList] = useState([]);

    const [userProfileInfo, setUserProfileInfo] = useState(null);

    const [configurationData, setConfigurationData] = useState(null);
    
    const [formatedCategory, setFormatedCategory] = useState([]);

    const getOverallCakeList = async () => {
        try {
            const getCakeAPIResponse = await getOverallCakeMenuList();
            setCakeObj(getCakeAPIResponse?.data)
        } catch (error) {
            console.error(error)
        }
    }

    const getMainCategoryList = async () => {
        try {
            const getMainCategoryListApiResponse = await getMainCategoryListApi();
            setMainCategoriesObj(getMainCategoryListApiResponse?.data)
        } catch (error) {
            console.error(error)
        }
    }

    const getSubCategoryList = async () => {
        try {
            const getSubCategoryListApiResponse = await getSubCategoryListApi();
            setSubCategoriesObj(getSubCategoryListApiResponse?.data)
        } catch (error) {
            console.error(error)
        } 
    }


    useEffect(() => {
        if (subCategoriesObj && mainCategoriesObj) {
          const mainCategoryFormatted = mainCategoriesObj?.map((mainCat) => {
            const subCategories = subCategoriesObj?.filter(
              (subCat) => subCat?.main_category?.id === mainCat?.id
            );

            return {
              ...mainCat,
              subcategories: subCategories,
            };
          });
          
          setFormatedCategory(mainCategoryFormatted);
        }
    }, [subCategoriesObj, mainCategoriesObj]);


    const GetMyOrders = async () => {
        try {
            const getOrderApiResponse = await getOrderApi();

            setMyOrdersList(getOrderApiResponse?.data)
        } catch (error) {
            console.error(error)
        }
    }

    const getUserProfile = async () => {
        try {
            const getProfileApiResponse = await getProfileApi();
            setUserProfileInfo(getProfileApiResponse?.data)
        } catch (error) {
            console.error(error)
        }
    }

    const getAddressList = async () => {
        try {
            const getAddressApiResponse = await getAddressApi();
            setCustomerAddressObj(getAddressApiResponse?.data)
        } catch (error) {
            console.error(error);
        }
    };

    const getOfferList = async () => {
        try {
            const getOfferApiResponse = await getOfferItemsApi();
            setOfferedItemsObj(getOfferApiResponse?.data)
        } catch (error) {
            console.error(error);
        }
    };

    const getOfferPageList = async () => {
        try {
            const getOfferPageApiResponse = await getOfferPageApi();
            setOfferedPageItemsObj(getOfferPageApiResponse?.data)
        } catch (error) {
            console.error(error);
        }
    };

    const [metaData, setMetaData] = useState(null);

    const getConfigurationList = async () => {
        try {
            let pathname = location?.pathname?.slice(1);
            if (meta_paths?.includes(pathname)) {
                const getConfigurationResponse = await getConfiguration();
                setConfigurationData(getConfigurationResponse?.data);
                let config_meta = (getConfigurationResponse?.data?.meta);
                let path_meta = config_meta?.[String(pathname)];
                setMetaData(path_meta)
            }           
            
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() =>{
        getConfigurationList()
    },[])
    

    useEffect(() => {
        if ((new Cookies()).get('web_access_token')) {
            setAccessToken((new Cookies()).get('web_access_token'))
        }
    }, []);

    useEffect(() => {
        getOverallCakeList();
        getSubCategoryList();
        getMainCategoryList();
        getOfferList();
    }, [])

    useEffect(() => {
        if (accessToken) {
            getUserProfile()
            getAddressList()
            GetMyOrders()
        }
    }, [accessToken])

    const [selectedCategory, setSelectedCategory] = useState("All");

    const [selectedMainCategory, setSelectedMainCategory] = useState(null); // Tracks selected main category

    return (
        <DataContext.Provider value={{
            isPreloaderShow, setIsPreloaderShow,
            accessToken, setAccessToken,
            cakeObj, setCakeObj,
            mainCategoriesObj, setMainCategoriesObj,
            subCategoriesObj, setSubCategoriesObj,
            galleryImageObj, setGalleryImageObj,
            cakeListApi, setCakeListApi,
            menuListObj, setMenuListObj,
            myOrdersList, setMyOrdersList,
            getAddressList,
            customerAddressObj, setCustomerAddressObj,
            initPageGallery, setInitPageGallery,
            initPageMenuList, setInitPageMenuList,
            initPageOffer, setInitPageOffer,
            getOfferList,
            offerApi, setOfferApi,
            offeredItemsObj, setOfferedItemsObj,
            offeredPageItemsObj, setOfferedPageItemsObj,
            configurationData,
            GetMyOrders,
            userProfileInfo,
            setUserProfileInfo,
            getUserProfile,
            selectedCategory, setSelectedCategory,
            selectedMainCategory, setSelectedMainCategory,
            metaData, setMetaData,
            formatedCategory, setFormatedCategory
        }}>
            {children}
        </DataContext.Provider>
    );
};

DataProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
