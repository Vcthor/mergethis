// src/components/Dashboard.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "react-calendar/dist/Calendar.css";
import { Building2, CalendarPlus } from "lucide-react";
import axios from "axios";
import styles from "./Dashboard.module.css";
import CustomCalendar from "./CustomCalendar";
import logo from "../assets/urslogo.png";
import logout from "../assets/logout.svg";
import EventModal from './EventModal';
import Slideshow from "./Slideshow";
import CouncilDisplayedit from './CouncilDisplayedit';
import ReportForm from "./ReportForm";

const Dashboard = () => {
  const loggedInUser = { id: 1 };
  const navigate = useNavigate();
  const userDetails = {
    username: "exampleUser",
    loggedInTime: new Date().toLocaleString(),
  };

 
 const [error, setError] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedSidebar, setSelectedSidebar] = useState("New Booking");
  const [newSidebarSelection, setNewSidebarSelection] =
    useState("Dashboard Overview");
  const [eventData, setEventData] = useState({
    fromHour: "",
    fromMinute: "00",
    fromAmPm: "", // No default AM/PM
    toHour: "",
    toMinute: "00",
    toAmPm: "", // No default AM/PM
    venue: "",
    name: "",
    organization: "",
    fromDate: "",
    toDate: "",
    duration: "",
    document: null,
    poster: null,
  });

  const handleLogout = () => {
    
    sessionStorage.clear(); 
  
    
    navigate("/login", { replace: true });
  };
  
  

  const renderSidebarContent = () => {
    switch (selectedSidebar) {
      case "New Booking":
        return <p>Form to create a new booking.</p>;
      case "Events":
        return (
          <div>
            <p>Upcoming events information.</p>
            <button
              className={styles.addEventButton}
              onClick={() => setModalOpen(true)}
            >
              Add Event
            </button>
          </div>
        );
      case "Report":
        return <div>
    
        <ReportForm userId={loggedInUser.id} /> {/* Pass userId to the ReportForm */}
      </div>
      default:
        return null;
    }
  };

 

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEventData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setEventData((prevData) => ({
      ...prevData,
      [name]: files[0],
    }));
  };


  const convertTo24Hour = (time, ampm) => {
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours);
    minutes = parseInt(minutes);
  
    if (ampm === "PM" && hours !== 12) {
      hours += 12;
    } else if (ampm === "AM" && hours === 12) {
      hours = 0;
    }
  
    return { hours, minutes };
  };

  const convertDatabaseDateToFormattedDate = (date) => {
    const newDate = new Date(date);  // Convert to JavaScript Date object
    const day = String(newDate.getDate()).padStart(2, '0');
    const month = String(newDate.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = newDate.getFullYear();
    return `${year}/${month}/${day}`;
  };
  

  const handleModalSubmit = async (e) => {
    e.preventDefault();
  
    // Ensure all time values are selected before proceeding
    if (
      eventData.fromHour &&
      eventData.fromMinute &&
      eventData.fromAmPm &&
      eventData.toHour &&
      eventData.toMinute &&
      eventData.toAmPm
    ) {
      // Convert user's from and to times to 24-hour format
      const userFrom = convertTo24Hour(eventData.fromHour + ":" + eventData.fromMinute, eventData.fromAmPm);
      const userTo = convertTo24Hour(eventData.toHour + ":" + eventData.toMinute, eventData.toAmPm);
  
      // Format the start and end times into a readable string
      const fromTime = `${String(eventData.fromHour).padStart(2, '0')}:${String(eventData.fromMinute).padStart(2, '0')} ${eventData.fromAmPm || 'AM'}`;
      const toTime = `${String(eventData.toHour).padStart(2, '0')}:${String(eventData.toMinute).padStart(2, '0')} ${eventData.toAmPm || 'AM'}`;
  
      const duration = `${fromTime} to ${toTime}`;
      console.log("Event Duration:", duration);
  
      try {
        const userFromDate = new Date(eventData.fromDate); // Convert to Date object
        const userToDate = eventData.toDate ? new Date(eventData.toDate) : null; // Only set toDate if provided
  
        // Validation: Ensure `toDate` is not earlier than `fromDate`
        if (userToDate && userToDate < userFromDate) {
          const errorMessage = "`To Date` cannot be earlier than `From Date`.";
          console.error(errorMessage);
          setError(errorMessage); // Update the error state
          return; // Prevent submission
        }
  
        console.log("Checking for overlapping events...");
  
        // Fetch all approved events from the server
        const response = await axios.get('http://localhost:5000/api/approved');
        const approvedEvents = response.data;
  
        // Validate for conflicts
        for (let event of approvedEvents) {
          const savedStartDate = new Date(event.date); // Assume event.date is the `fromDate`
          const savedEndDate = event.datefrom ? new Date(event.datefrom) : savedStartDate; // If `toDate` is not provided, use `fromDate`
  
          // Check if the event is in the same venue and dates overlap
          if (event.venue === eventData.venue) {
            if (
              userFromDate <= savedEndDate &&
              (!userToDate || userToDate >= savedStartDate) // Ensure date overlap works even if `toDate` is null
            ) {
              console.log("Date conflict found with event:", event);
  
              // Check for time conflict within the same venue and overlapping dates
              const [savedFrom, savedTo] = event.duration.split(' to ');
              const savedFromTime = convertTo24Hour(savedFrom.split(' ')[0] + ":" + savedFrom.split(' ')[1], savedFrom.split(' ')[2]);
              const savedToTime = convertTo24Hour(savedTo.split(' ')[0] + ":" + savedTo.split(' ')[1], savedTo.split(' ')[2]);
  
              // Time overlap check
              if (
                (userFrom.hours < savedToTime.hours || (userFrom.hours === savedToTime.hours && userFrom.minutes < savedToTime.minutes)) &&
                (userTo.hours > savedFromTime.hours || (userTo.hours === savedFromTime.hours && userTo.minutes > savedFromTime.minutes))
              ) {
                const errorMessage = 'The selected time overlaps with an existing event at the same venue.';
                console.error(errorMessage, event);
                setError(errorMessage); // Update the error state
                return; // Prevent submission
              }
            }
          }
        }
  
        console.log("No conflicts found. Proceeding to save event...");
  
        // If no conflicts found, proceed with form submission
        const formData = new FormData();
        formData.append("venue", eventData.venue);
        formData.append("name", eventData.name);
        formData.append("organization", eventData.organization);
        formData.append("date", eventData.fromDate); // Store fromDate in 'date'
  
        if (eventData.toDate) {
          formData.append("datefrom", eventData.toDate); // Store toDate only if provided
        }
  
        formData.append("duration", duration); // Use the formatted duration string
        formData.append("document", eventData.document);
        formData.append("poster", eventData.poster);
  
        try {
          const postResponse = await axios.post("http://localhost:5000/api/events", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
  
          if (postResponse.status === 200) {
            console.log("Event successfully saved to the database:", postResponse.data);
            alert("Event added successfully!");
            setError(null); // Clear the error state
            setModalOpen(false); // Close the modal after successful submission
          }
        } catch (postError) {
          console.error("Error saving event to database:", postError);
          setError("Failed to add the event.");
        }
      } catch (fetchError) {
        console.error("Error during validation:", fetchError);
        setError("Failed to validate the event details.");
      }
    } else {
      console.warn("Incomplete time fields provided by the user.");
      setError("Please fill in all time fields correctly.");
    }
  };
  
  
  
  
  
  
  
  
  
  
  

  return (
    <div>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.logoContainer}>
          <img src={logo} alt="Logo" className={styles.logo} />
          <div className={styles.titleflex}>
            <h1 className={styles.title}>
              University of Rizal System - Antipolo Campus
            </h1>
            <h1 className={styles.subtitle}>Event Booking System</h1>
          </div>
        </div>
        <button className={styles.logoutButton} onClick={handleLogout}>
  <img src={logout} className={styles.loginIcon} />
  Log Out
</button>

      </nav>
      <div className={styles.container}>
        <div className={styles.firstContainer}>
          {/* Upcoming Events Section */}
          <Slideshow />
       

          <div className={styles.calendar}>
            <h1>Campus Calendar</h1>
            <CustomCalendar />
          </div>
        </div>
        <div className={styles.SecondContainer}>
  <div className={styles.venueBooklistContainer}>
    <h2 className={styles.header}>
      <CalendarPlus size={20} color="#063970" /> Venue Booklist
    </h2>
    <div className={styles.sidebarLayout}>
      <div className={styles.sidebarContainer}>
        <div className={styles.sidebarr}>
          {["Events", "Report"].map((item) => (
            <button
              key={item}
              onClick={() => setSelectedSidebar(item)}
              className={{
                ...styles.sidebarButton,
                backgroundColor:
                  selectedSidebar === item ? "#0e4296" : "transparent",
                color: selectedSidebar === item ? "#fff" : "#0e4296",
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <div className={styles.sidebarContent}>
          <h3>{selectedSidebar}</h3>
          {renderSidebarContent()}
        </div>
      </div>
    </div>
  </div>

  {/* News and Information Section (on the right) */}
  <div className={styles.layoutContainer}>
    <CouncilDisplayedit />
  </div>


  


  {/* Merged Vision and Mission Section */}
  <div className={styles.mergedSection}>
    <h3 className={styles.vgmoHeader}>VISION</h3>
    <p className={styles.vgmo}>
      The leading University in human resource development, knowledge and
      technology generation, and environmental stewardship.
    </p>
    <h3 className={styles.vgmoHeader}>MISSION</h3>
    <p className={styles.vgmo}>
      The University of Rizal System is committed to nurture and produce
      upright and competent graduates and empowered community through
      relevant and sustainable higher professional and technical
      instruction, research, extension, and production services.
    </p>
    <h3 className={styles.vgmoHeader}>CORE VALUES</h3>
    <p>R – Responsiveness</p>
    <p>I – Integrity</p>
    <p>S – Service</p>
    <p>E – Excellence</p>
    <p className={styles.vgmo}>S – Social Responsibility</p>
    <h3 className={styles.vgmoHeader}>QUALITY POLICY</h3>
    <p className={styles.vgmo}>
      The University of Rizal System commits to deliver excellent products
      and services to ensure total stakeholders’ satisfaction in
      instruction, research, extension, production and dynamic
      administrative support and to continuously improve its Quality
      Management System processes to satisfy all applicable requirements.
    </p>
  </div>




</div>

        {/* Event Modal */}
      <EventModal 
        isModalOpen={isModalOpen}
        setModalOpen={setModalOpen}
        eventData={eventData}
        handleInputChange={handleInputChange}
        handleFileChange={handleFileChange}
        handleModalSubmit={handleModalSubmit}
      />
      </div>
      {/* Footer */}
      <footer className={styles.footer}>
        <p>
          &copy; {new Date().getFullYear()} University of Rizal Sytem Antipolo
          Campus<br></br> All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
