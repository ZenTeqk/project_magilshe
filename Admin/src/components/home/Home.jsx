import { Button, Card, CardContent, Grid, Typography, LinearProgress } from '@mui/material';
import './Home.scss';
import { faDollarSign, faUser, faTasks, faWallet, faCartShopping } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Table } from 'rsuite';
import Column from 'rsuite/esm/Table/TableColumn';
import { Cell, HeaderCell } from 'rsuite-table';
import 'rsuite/dist/rsuite.min.css';
import React, { useContext, useEffect, useState } from "react";
import { GetDashboardDataUrl } from '../../Constant/urls/urls';
import { GetApi } from '../../hooks/Get/GetApi';
import MainContext from '../../context/MainContext';




const Home = () => {
  const { ShowNotification } = useContext(MainContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [tableData, setTableData] = useState(null)

  const getDashboardData = async () => {
    try {
      const result = await GetApi(GetDashboardDataUrl);
      
      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {

        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        setDashboardData(result.data);
      }

    } catch (error) {
      console.error("getOrders Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
  };


  useEffect(() => {
    getDashboardData();
  }, [])



  return (
    <div>
      <section>
        <Grid container spacing={3}>
          {[
             {
              label: "Total Order",
              value: dashboardData?.count?.total_order,
              icon: faCartShopping,
              color: "orange",
            },
            {
              label: "Total Delivered",
              value: dashboardData?.count?.total_delivered,
              icon: faCartShopping,
              color: "green",
            },
            {
              label: "Total Pending",
              value: dashboardData?.count?.total_pending,
              icon: faCartShopping,
              color: "red",
            },
            {
              label: "Today Ordered",
              value: dashboardData?.count?.today_order,
              icon: faCartShopping,
              color: "red",
            },                       
            {
              label: "Today Pending",
              value: dashboardData?.count?.today_pending,
              icon: faCartShopping,
              color: "blue",
            },
            {
              label: "Today Delivered",
              value: dashboardData?.count?.today_delivered,
              icon: faCartShopping,
              color: "green",
            },            
            // {
            //   label: "Total Users",
            //   value: dashboardData?.count?.total_users,
            //   icon: faCartShopping,
            //   color: "blue",
            // },
          ].map((item, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card className={`home-card ${item.color}`}>
                <FontAwesomeIcon
                  icon={item.icon}
                  className={`icon ${item.color}`}
                />
                <div className="ms-3 text-start">
                  <p>{item.label}</p>
                  <h4>{item.value}</h4>
                </div>
              </Card>
            </Grid>
          ))}
        </Grid>
     
      </section>

      <section style={{ marginTop: "30px", display: "flex", gap: "20px", display: "none" }}>
        <div style={{ flex: 1 }}>
          <Table
            height={400}
            data={
              !!dashboardData && !!dashboardData.data
                ? dashboardData.data?.recent_10_orders
                : []
            }
            className="table-bordered"
            onRowClick={(rowData) => {
              
            }}
          >
            <Column flexGrow={1} align="center">
              <HeaderCell
                style={{
                  backgroundColor: "#006ebb",
                  color: "#fff",
                  fontWeight: "bold",
                }}
              >
                Id
              </HeaderCell>
              <Cell>{(rowData) => rowData.id || "N/A"}</Cell>
            </Column>

            <Column flexGrow={1}>
              <HeaderCell
                style={{
                  backgroundColor: "#006ebb",
                  color: "#fff",
                  fontWeight: "bold",
                }}
              >
                Cutomer Name
              </HeaderCell>
              <Cell>{(rowData) => rowData.customer?.name || "N/A"}</Cell>
            </Column>

            <Column flexGrow={1}>
              <HeaderCell
                style={{
                  backgroundColor: "#006ebb",
                  color: "#fff",
                  fontWeight: "bold",
                }}
              >
                order Details
              </HeaderCell>
              <Cell>{(rowData) => rowData.delivery_person?.name || "N/A"}</Cell>
            </Column>

            <Column flexGrow={1}>
              <HeaderCell
                style={{
                  backgroundColor: "#006ebb",
                  color: "#fff",
                  fontWeight: "bold",
                }}
              >
                Address
              </HeaderCell>
              <Cell>
                {(rowData) => rowData.delivery_address?.address || "N/A"}
              </Cell>
            </Column>

            <Column flexGrow={1}>
              <HeaderCell
                style={{
                  backgroundColor: "#006ebb",
                  color: "#fff",
                  fontWeight: "bold",
                }}
              >
                Phone Number
              </HeaderCell>
              <Cell>
                {(rowData) => rowData.delivery_person?.phone || "N/A"}
              </Cell>
            </Column>

            <Column flexGrow={1}>
              <HeaderCell
                style={{
                  backgroundColor: "#006ebb",
                  color: "#fff",
                  fontWeight: "bold",
                }}
              >
                Order Time
              </HeaderCell>
              <Cell>
                {(rowData) => {
                  if (!rowData.order_time) return "N/A";

                  const date = new Date(rowData.order_time);
                  const formattedTime = date.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  });
                  const formattedDate = date.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  });

                  return `${formattedTime} ${formattedDate}`;
                }}
              </Cell>
            </Column>
          </Table>
        </div>

        {/* Second Table */}
        {/* <div style={{ flex: 1 }}>
          <Table
            height={400}
            data={!!dashboardData && !!dashboardData.data ? dashboardData.data?.recent_10_orders : []}
            className="table-bordered"
            onRowClick={rowData => {
              
            }}
          >
            <Column flexGrow={1} align="center">
              <HeaderCell style={{ backgroundColor: '#006ebb', color: '#fff', fontWeight: 'bold' }}>
                Id
              </HeaderCell>
              <Cell dataKey="recent_10_orders?.id" />
            </Column>

            <Column flexGrow={1}>
              <HeaderCell style={{ backgroundColor: '#006ebb', color: '#fff', fontWeight: 'bold' }}>
                First Name
              </HeaderCell>
              <Cell dataKey="first_name" />
            </Column>

            <Column flexGrow={1}>
              <HeaderCell style={{ backgroundColor: '#006ebb', color: '#fff', fontWeight: 'bold' }}>
                Last Name
              </HeaderCell>
              <Cell dataKey="last_name" />
            </Column>

            <Column flexGrow={1}>
              <HeaderCell style={{ backgroundColor: '#006ebb', color: '#fff', fontWeight: 'bold' }}>
                Gender
              </HeaderCell>
              <Cell dataKey="gender" />
            </Column>

            <Column flexGrow={1}>
              <HeaderCell style={{ backgroundColor: '#006ebb', color: '#fff', fontWeight: 'bold' }}>
                Age
              </HeaderCell>
              <Cell dataKey="age" />
            </Column>

            <Column flexGrow={1}>
              <HeaderCell style={{ backgroundColor: '#006ebb', color: '#fff', fontWeight: 'bold' }}>
                Action
              </HeaderCell>
              <Cell style={{ padding: '6px' }}>
                {rowData => (
                  <Button appearance="link" onClick={() => alert(`id:${rowData.id}`)}>
                    Edit
                  </Button>
                )}
              </Cell>
            </Column>
          </Table>
        </div> */}
      </section>
    </div>
  );

};

export default Home;
