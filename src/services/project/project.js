import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './Project.css';
import { Bar } from 'react-chartjs-2';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { useNavigate } from 'react-router-dom';



import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


const Project = () => {
    const navigate = useNavigate();
    const {id} = useParams();
    const {projectId} = useParams();
    const [project, setProject] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const {isAuthenticated, getIdTokenClaims} = useAuth0();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [showAssigneesForm, setShowAssigneesForm] = useState(false);
    const [showUpdateForm, setShowUpdateForm] = useState(false);    const [showTaskForm, setShowTaskForm] = useState(false);
    const [showRoleForm, setShowRoleForm] = useState(false);
    const [showMemberInput, setShowMemberInput] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [isKpiVisible, setIsKpiVisible] = useState(false); // State for KPI dropdown visibility
    const [showUpdateTaskForm, setShowUpdateTaskForm] = useState(false);
    const [taskDetails, setTaskDetails] = useState({
        id: null,
        taskName: '',
        taskDescription: '',
        taskPriority: 1,
        taskStartDate: '',
        taskEndDate: '',
        taskEstimatedEndDate: '',
        status: 'NOT_STARTED',
        assignedUsers: [],
    });

    const [updatedProject, setUpdatedProject] = useState({ ...project });

    const [members, setMembers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [roleName, setRoleName] = useState('');
    const [kpiData, setKpiData] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');

    const fetchProject = async (idToken) => {
        try {
            const response = await axios.get(`http://localhost:8091/api/projects/${projectId}`, {
                headers: {Authorization: `Bearer ${idToken}`},
            });
            console.log("Project data:", response.data);
            const membersResponse = await axios.get(`http://localhost:8091/api/projects/${projectId}/members`, {
                headers: {Authorization: `Bearer ${idToken}`},
            });
            console.log("Members data:", membersResponse.data);
            const project = {
                ...response.data,           // Project details
                members: membersResponse.data,  // Project members
            };
            setProject(response.data);
            setSelectedProject(response.data);
            setUpdatedProject({
                name: response.data.name,
                description: response.data.description,
            });
            setMembers(membersResponse.data);
            console.log('project')
            return project;

        } catch (error) {
            console.error('Error fetching project details:', error);
            setErrorMessage('An error occurred while fetching project details.');
        }
    };


    const fetchTasks = async (projectId, idToken) => {
        console.log("projectId, idToken", projectId, idToken);
        try {
            console.log("projectId, idToken", projectId, idToken);
            const tasksResponse = await axios.get(`http://localhost:8095/api/tasks/project/${projectId}`, {
                headers: {Authorization: `Bearer ${idToken}`},
            });
            setTasks(tasksResponse.data);
            console.log("taskresponsess:", tasksResponse.data);
        } catch (error) {
            setErrorMessage('An error occurred while fetching tasks.');
        }
    };

    const fetchData = async (idToken) => {
        try {

            setLoading(true);
            console.log("Ffff")
            const projectData = await fetchProject(idToken);
            if (projectData) {
                await fetchTasks(projectData.id, idToken);
            }
            console.log('Fetching tasks for project with ID:', projectData.id);
        } catch (error) {
            setErrorMessage('An error occurred while fetching data.');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (isAuthenticated) {
            const fetchDataWrapper = async () => {
                try {
                    const idTokenClaims = await getIdTokenClaims();
                    const idToken = idTokenClaims.__raw;
                    fetchData(idToken);
                } catch (error) {
                    console.error('Error during authentication:', error);
                }
            };
            fetchDataWrapper();
        }
    }, [id, isAuthenticated, getIdTokenClaims]);

    const handleUpdateProject = async () => {
        if (isAuthenticated) {
            try {
                setLoading(true);
                const idTokenClaims = await getIdTokenClaims();
                const idToken = idTokenClaims.__raw;

                const response = await axios.put(
                    `http://localhost:8091/api/projects/${projectId}`,
                    updatedProject,
                    {
                        headers: { Authorization: `Bearer ${idToken}` },
                    }
                );

                if (response.status === 200) {
                    setProject(response.data);
                    setShowUpdateForm(false);
                    alert('Project updated successfully!');
                }
            } catch (error) {
                alert('Failed to update project. Please try again.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDeleteProject = async () => {
        if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            if (isAuthenticated) {
                try {
                    setLoading(true);
                    const idTokenClaims = await getIdTokenClaims();
                    const idToken = idTokenClaims.__raw;

                    await axios.delete(`http://localhost:8091/api/projects/${projectId}`, {
                        headers: { Authorization: `Bearer ${idToken}` },
                    });

                    alert('Project deleted successfully!');
                    navigate('/projects'); // Navigate back to projects list
                } catch (error) {
                    alert('Failed to delete project. Please try again.');
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUpdatedProject((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleCreateRole = async () => {
        if (!roleName || !selectedProject) {
            alert('Please provide both a valid role name and a project');
            return;
        }

        try {
            const response = await axios.post('http://localhost:8091/api/roles', {
                roleName: roleName,
                projectId: selectedProject.id,
            });

            if (response.status === 200 || response.status === 201) {
                alert(`Role "${roleName}" created successfully`);
                setRoleName('');
                setSelectedProject(null);
            } else {
                console.error('Failed to create role:', response);
                alert(`Failed to create role. Status: ${response.status}, Message: ${response.data?.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error creating role:', error);
            alert(`Failed to create role. Error: ${error.response?.data?.message || error.message}`);
        }
    };


    const fetchRoles = async () => {
        try {
            const projectId = selectedProject.id;
            const response = await axios.get('http://localhost:8091/api/roles/project/${projectId}');
            setRoles(response.data);
        } catch (error) {
            console.error('Error fetching roles:', error);
        }
    };

    const handleCreateTask = async () => {
        const { taskName, taskDescription, taskPriority, taskStartDate, taskEndDate, taskEstimatedEndDate, status, assignedUsers } = taskDetails;

        if (!taskName || !taskDescription) {
            alert('Please provide task name and description');
            return;
        }

        if (isAuthenticated && selectedProject) {
            try {
                setLoading(true);

                const idTokenClaims = await getIdTokenClaims();
                const idToken = idTokenClaims.__raw;

                const taskData = {
                    projectId: selectedProject.id,
                    taskName,
                    taskDescription,
                    taskPriority,
                    taskStartDate: taskStartDate || null,
                    taskEndDate: taskEndDate || null,
                    taskEstimatedEndDate: taskEstimatedEndDate || null,
                    createdBy: idTokenClaims.email,
                    status: status || 'NOT_STARTED',
                    assignedUsers: assignedUsers || [],
                };

                // Send request to create task
                const response = await axios.post(`http://localhost:8095/api/tasks`, taskData, {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                    },
                });

                if (response.status === 200 || response.status === 201) {
                    alert('Task added successfully!');

                    // Immediately add the new task to the task list in state
                    setTasks((prevTasks) => [
                        ...prevTasks,
                        response.data,  // Assuming response.data contains the newly created task
                    ]);

                    // Reset the form
                    setTaskDetails({
                        taskName: '',
                        taskDescription: '',
                        taskPriority: 1,
                        taskStartDate: '',
                        taskEndDate: '',
                        taskEstimatedEndDate: '',
                        status: 'NOT_STARTED',
                        assignedUsers: [],
                    });

                    setShowTaskForm(false);
                } else {
                    alert(`Failed to create task. Status code: ${response.status}`);
                }
            } catch (error) {
                alert('Error creating task:', error.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleUpdateTask = async () => {
        if (!taskDetails.taskId) {
            console.error('Task ID is missing');
            return;
        }

        console.log('Updating task with ID:', taskDetails.taskId);

        try {
            setLoading(true);

            const idTokenClaims = await getIdTokenClaims();
            const idToken = idTokenClaims.__raw;

            // Prepare the payload
            const { id, ...updatedTaskDetails } = taskDetails;

            const response = await axios.put(
                `http://localhost:8095/api/tasks/${taskDetails.taskId}`, // Use taskId here
                updatedTaskDetails,
                {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                    },
                }
            );

            console.log('Task updated successfully', response.data);
            setShowUpdateTaskForm(false);
        } catch (error) {
            console.error('Error updating task:', error);
        } finally {
            setLoading(false);
        }
    };



    const handleSelectTaskForUpdate = (task) => {
        console.log('Clicked Task:', task); // Log the full task to inspect

        // Ensure taskId is available
        if (task.taskId) {
            console.log('Task ID:', task.taskId); // Log the task ID to confirm
        } else {
            console.error('Task ID is missing or undefined');
        }

        // Set the task details for the selected task
        setTaskDetails({
            id: task.taskId, // Using task.taskId for modal purposes
            taskId: task.taskId, // Include taskId in the payload for the backend
            taskName: task.taskName,
            taskDescription: task.taskDescription,
            taskPriority: task.taskPriority,
            taskStartDate: task.taskStartDate,
            taskEndDate: task.taskEndDate,
            taskEstimatedEndDate: task.taskEstimatedEndDate,
            status: task.status,
            assignedUsers: task.assignedUsers,
            projectId: task.projectId, // Include projectId
        });

        // Show the update task form modal
        setShowUpdateTaskForm(true);
    };

    const handleDeleteTask = async () => {
        if (!taskDetails.taskId) {
            console.error('Task ID is missing');
            return;
        }

        const confirmDelete = window.confirm(
            'Are you sure you want to delete this task? This action cannot be undone.'
        );
        if (!confirmDelete) return;

        try {
            setLoading(true);

            const idTokenClaims = await getIdTokenClaims();
            const idToken = idTokenClaims.__raw;

            const response = await axios.delete(
                `http://localhost:8095/api/tasks/${taskDetails.taskId}`,
                {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                    },
                }
            );

            console.log('Task deleted successfully', response.data);

            // Optionally refresh the task list or remove the task from the state
            setTasks((prevTasks) => prevTasks.filter((task) => task.taskId !== taskDetails.taskId));

            setShowUpdateTaskForm(false); // Close the modal after successful deletion
        } catch (error) {
            console.error('Error deleting task:', error);
        } finally {
            setLoading(false);
        }
    };


    const formatStatus = (status) => {
        switch (status) {
            case 'IN_PROGRESS':
                return 'In Progress';
            case 'NOT_STARTED':
                return 'Not Started';
            case 'DONE':
                return 'Done';
            default:
                return status;
        }
    };

    const handleDeleteMember = async (email) => {
        if (!selectedProject) {
            alert('No project selected');
            return;
        }

        if (window.confirm(`Are you sure you want to remove ${email} from the project?`)) {
            try {
                const idTokenClaims = await getIdTokenClaims();
                const idToken = idTokenClaims.__raw;

                await axios.delete(`http://localhost:8091/api/projectmembers/${selectedProject.id}/${email}`, {
                    headers: { Authorization: `Bearer ${idToken}` },
                });

                setMembers(members.filter(member => member.email !== email));
                alert('Member removed successfully');
            } catch (error) {
                console.error('Error removing member:', error);
                alert('Failed to remove member. Please try again.');
            }
        }
    };

    const handleAddMember = async () => {
        if (!email) {
            alert('Please provide a valid email');
            return;
        }

        try {
            const response = await axios.post('http://localhost:8091/api/projectmembers/add', null, {
                params: {
                    projectName: selectedProject.name,
                    email: email,
                },
            });

            if (response.status === 200) {
                alert(`Invitation sent to ${email}`);
                setEmail('');
                setShowMemberInput(false);
            }
        } catch (error) {
            alert('Failed to send invitation. Please try again.');
        }
    };



    useEffect(() => {
        const fetchKpiData = async () => {
            try {
                const idTokenClaims = await getIdTokenClaims();
                const idToken = idTokenClaims.__raw;

                console.log('Fetching KPI data for project ID:', projectId);
                const response = await axios.get(`http://localhost:8010/api/kpi/project/${projectId}`, {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                    },
                });

                const data = response.data;

                if (data && Array.isArray(data.cycleTimes)) {
                    data.cycleTimes = data.cycleTimes.map(task => ({
                        taskId: task.taskId,
                        cycleTime: Number(task.cycleTime),
                    }));
                } else {
                    data.cycleTimes = [];
                }

                console.log('KPI data fetched:', response.data);
                setKpiData(data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching KPI data:', error);
                setLoading(false);
            }
        };
        fetchKpiData();
        const createWebSocket = () => new SockJS('http://localhost:8095/ws');
        let stompClient = Stomp.over(createWebSocket);
        const connectWebSocket = () => {
            stompClient.connect(
                {},
                () => {
                    console.log('Connected to WebSocket');
                    stompClient.subscribe('/topic/kpiUpdates', () => {
                        console.log('TaskService update detected. Fetching updated KPI data...');
                        fetchKpiData(); // Trigger KPI fetch on task update
                    });
                },
                (error) => {
                    console.error('WebSocket connection error:', error);
                    setTimeout(connectWebSocket, 5000); // Retry connection
                }
            );
        };
        connectWebSocket();
        return () => {
            if (stompClient) {
                stompClient.disconnect(() => {
                    console.log('Disconnected from WebSocket');
                });
            }
        };
    }, [projectId, getIdTokenClaims]);
    if (loading) return <div>Loading...</div>;
    if (!kpiData || !Array.isArray(kpiData.cycleTimes)) {
        return <div>No data available</div>;
    }
    const cycleTimes = kpiData.cycleTimes;
    const taskIds = cycleTimes.map(task => task.taskId);
    const chartData = {
        labels: taskIds,
        datasets: [
            {
                label: 'Cycle Time (days)',
                data: cycleTimes.map(task => task.cycleTime),
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
        ],
    };
    const chartOptions = {
        responsive: true,
        scales: {
            x: {title: {display: true, text: 'Task ID'},},
            y: {title: {display: true, text: 'Cycle Time (Days)'},
                beginAtZero: true,},
        },
    };
    const toggleKpiVisibility = () => {
        setIsKpiVisible(!isKpiVisible);
    };
    if (loading) return <div>Loading...</div>;
    if (errorMessage) return <div>{errorMessage}</div>;


    return (
        <div className="page-container">
            {loading && <div>Loading...</div>}
            {errorMessage && <div>{errorMessage}</div>}

            {project ? (
                <div className="project-pageNB">

                    {/* Project Information Container */}
                    <div className="project-info-container">
                        <h1>{project.name}</h1>
                        <p>{project.description}</p>

                        <div className="button-rowNB">
                            <button onClick={() => setShowTaskForm(true)}>New Task</button>
                            <button onClick={() => setShowAssigneesForm(true)}>Assignees</button>
                            <button onClick={() => setShowUpdateForm(true)}>Modify</button>
                        </div>
                    </div>

                    <div className="members-info-containerNB">
                        <h1>Projects Assignees</h1>
                        <div className="members-sectionNB">
                            <h4>Joined Members : </h4>
                            <div className="members-grid">
                                {members.map(member => (
                                    <div key={member.email} className="member-card">
                                        <div className="member-info">
                                            <span>{member.email}</span>
                                            <span className="role">{member.role}</span>
                                        </div>
                                        <button onClick={() => handleDeleteMember(member.email)}>
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>


                        {/* Buttons Section */}
                        <div className="button-rowNB">
                            <button onClick={() => {
                                console.log("Button clicked!");
                                setShowMemberInput(true);
                            }}>
                                Invite Members
                            </button>

                        </div>


                    </div>

                    {showMemberInput && (
                        <div id="invite-member-modal" className="modalNB">
                            <div className="modal-contentNB">
                                <h3>Invite Member</h3>
                                <div className="project-formNB">
                                    <label>Email Address:</label>
                                    <input
                                        type="email"
                                        placeholder="Enter email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                    {errorMessage && <div className="error-messageNB">{errorMessage}</div>}
                                    <div className="button-containerNB">
                                        <button onClick={handleAddMember} className="create-btnNB">Send Invitation</button>
                                        <button className="close-btnNB" onClick={() => setShowMemberInput(false)}>Close</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Task Modal */}
                    {showTaskForm && (
                        <div className="modalNB">
                            <div className="modal-contentNB">
                                <span className="closeNB" onClick={() => setShowTaskForm(false)}>&times;</span>
                                <h2>Create Task</h2>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    handleCreateTask();
                                }}>
                                    <label>Task Name:
                                        <input
                                            type="text"
                                            value={taskDetails.taskName}
                                            onChange={(e) => setTaskDetails({...taskDetails, taskName: e.target.value})}
                                            required
                                        />
                                    </label>

                                    <label>Task Description:
                                        <textarea
                                            value={taskDetails.taskDescription}
                                            onChange={(e) => setTaskDetails({
                                                ...taskDetails,
                                                taskDescription: e.target.value
                                            })}
                                            required
                                        />
                                    </label>

                                    <label>Priority:
                                        <input
                                            type="number"
                                            value={taskDetails.taskPriority}
                                            onChange={(e) => setTaskDetails({
                                                ...taskDetails,
                                                taskPriority: parseInt(e.target.value)
                                            })}
                                            min="1"
                                            max="5"
                                        />
                                    </label>

                                    <label>Start Date:
                                        <input
                                            type="date"
                                            value={taskDetails.taskStartDate}
                                            onChange={(e) => setTaskDetails({
                                                ...taskDetails,
                                                taskStartDate: e.target.value
                                            })}

                                        />
                                    </label>

                                    <label>End Date:
                                        <input
                                            type="date"
                                            value={taskDetails.taskEndDate}
                                            onChange={(e) => setTaskDetails({
                                                ...taskDetails,
                                                taskEndDate: e.target.value
                                            })}
                                        />
                                    </label>

                                    <label>Estimated End Date:
                                        <input
                                            type="date"
                                            value={taskDetails.taskEstimatedEndDate}
                                            onChange={(e) => setTaskDetails({
                                                ...taskDetails,
                                                taskEstimatedEndDate: e.target.value
                                            })}
                                        />
                                    </label>

                                    <label>Status:
                                        <select
                                            value={taskDetails.status}
                                            onChange={(e) => setTaskDetails({...taskDetails, status: e.target.value})}
                                        >
                                            <option value="NOT_STARTED">Not Started</option>
                                            <option value="IN_PROGRESS">In Progress</option>
                                            <option value="COMPLETED">Completed</option>
                                        </select>
                                    </label>

                                    <button type="submit" disabled={loading}>Add Task To Project</button>
                                </form>
                            </div>
                        </div>
                    )}

                    {showUpdateForm && (
                        <div id="modify-project-modal" className="modalNB">
                            <div className="modal-contentNB">
                                <h3>Modify Project Info</h3>
                                <div className="project-formNB">
                                    <label>Project Name:</label>
                                    <input
                                        type="text"
                                        placeholder="Enter Project Name"
                                        value={updatedProject.name || ""}
                                        onChange={(e) =>
                                            setUpdatedProject((prevState) => ({...prevState, name: e.target.value}))
                                        }
                                    />
                                    <label>Description:</label>
                                    <textarea
                                        placeholder="Enter Project Description"
                                        value={updatedProject.description || ""}
                                        onChange={(e) =>
                                            setUpdatedProject((prevState) => ({
                                                ...prevState,
                                                description: e.target.value
                                            }))
                                        }
                                    />
                                    <button onClick={handleUpdateProject} disabled={loading}>
                                        {loading ? 'Updating...' : 'Update Project'}
                                    </button>
                                    <button onClick={handleDeleteProject} disabled={loading}>
                                        {loading ? 'Deleting...' : 'Delete Project'}
                                    </button>
                                    <button className="close-btnNB" onClick={() => setShowUpdateForm(false)}>Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Update Task Modal */}
                    {showUpdateTaskForm && (
                        <div className="modalNB">
                            <div className="modal-contentNB">
                                <h2>Update Task</h2>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleUpdateTask(); // Call the function to update the task
                                    }}
                                >
                                    <label>Task Name:</label>
                                    <input
                                        type="text"
                                        value={taskDetails.taskName}
                                        onChange={(e) =>
                                            setTaskDetails({...taskDetails, taskName: e.target.value})
                                        }
                                        required
                                    />

                                    <label>Task Description:</label>
                                    <textarea
                                        value={taskDetails.taskDescription}
                                        onChange={(e) =>
                                            setTaskDetails({...taskDetails, taskDescription: e.target.value})
                                        }
                                        required
                                    />

                                    <label>Priority:
                                        <input
                                            type="number"
                                            value={taskDetails.taskPriority}
                                            onChange={(e) => setTaskDetails({
                                                ...taskDetails, taskPriority: parseInt(e.target.value)
                                            })}
                                            min="1"
                                            max="5"
                                        />
                                    </label>

                                    <label>Status:
                                        <select
                                            value={taskDetails.status}
                                            onChange={(e) => setTaskDetails({...taskDetails, status: e.target.value})}
                                        >
                                            <option value="NOT_STARTED">Not Started</option>
                                            <option value="IN_PROGRESS">In Progress</option>
                                            <option value="COMPLETED">Completed</option>
                                        </select>
                                    </label>

                                    <label>Start Date:</label>
                                    <input
                                        type="date"
                                        value={taskDetails.taskStartDate}
                                        onChange={(e) =>
                                            setTaskDetails({...taskDetails, taskStartDate: e.target.value})
                                        }
                                        required
                                    />

                                    <label>End Date:</label>
                                    <input
                                        type="date"
                                        value={taskDetails.taskEndDate}
                                        onChange={(e) =>
                                            setTaskDetails({...taskDetails, taskEndDate: e.target.value})
                                        }
                                        required
                                    />

                                    <label>Estimated End Date:</label>
                                    <input
                                        type="date"
                                        value={taskDetails.taskEstimatedEndDate}
                                        onChange={(e) =>
                                            setTaskDetails({...taskDetails, taskEstimatedEndDate: e.target.value})
                                        }
                                        required
                                    />

                                    <button type="submit" disabled={loading}>Update Task Info</button>
                                    <button
                                        type="button"
                                        className="close-btnNB"
                                        onClick={() => setShowUpdateTaskForm(false)}
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        className="delete-btnNB"
                                        onClick={handleDeleteTask} // Call the delete function
                                        disabled={loading} // Optionally disable while loading
                                    >
                                        Delete Task
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* KPI Container */}
                    {kpiData ? (
                        <div className="kpi-container">
                            <div
                                className="kpi-header"
                                style={{
                                    background: isKpiVisible
                                        ? 'none' // No background gradient when shown
                                        : 'linear-gradient(135deg, #39b18b, #185a9d)', // Gradient when hidden
                                    color: isKpiVisible ? 'black' : 'white', // White text when hidden, black when shown
                                    cursor: 'pointer', // Make the header clickable
                                    padding: '10px', // Optional: Add some padding to the header
                                    borderRadius: '8px' // Optional: Give the header some rounded corners
                                }}
                                onClick={toggleKpiVisibility}
                            >
                                <h1>
                                    View your project progress {isKpiVisible ? '▲' : '▼'}
                                </h1>
                            </div>
                            {isKpiVisible && (
                                <div className="kpi-charts">
                                    <div
                                        style={{display: 'flex', justifyContent: 'space-around', marginBottom: '30px'}}>
                                        <div style={{width: '150px', height: '150px'}}>
                                            <h4>On-Time Completion Rate</h4>
                                            <CircularProgressbar
                                                value={kpiData.onTimeCompletionRate}
                                                text={`${kpiData.onTimeCompletionRate.toFixed(2)}%`}
                                                styles={{path: {stroke: '#4caf50'}, text: {fill: '#4caf50'}}}
                                            />
                                        </div>
                                        <div style={{width: '150px', height: '150px'}}>
                                            <h4>Project Progress</h4>
                                            <CircularProgressbar
                                                value={kpiData.progress}
                                                text={`${kpiData.progress.toFixed(2)}%`}
                                                styles={{path: {stroke: '#ff9800'}, text: {fill: '#ff9800'}}}
                                            />
                                        </div>
                                    </div>
                                    <br/><br/>
                                    <div style={{width: '500px', height: '300px', margin: '0 auto'}}>
                                        <h4>Cycle Times per Task</h4>
                                        <Bar data={chartData} options={chartOptions}/>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>No data available</div>
                    )}

                    {/* Task List Container */}
                    <div className="task-list-containerNB">
                        <div className="tasksNB">
                            {tasks.length > 0 ? (
                                tasks.map((task) => (
                                    <div className="task-item-wrapperNB" key={task.id}>
                                        <div
                                            className="task-itemNB"
                                            onClick={() => handleSelectTaskForUpdate(task)} // Handle task click
                                        >

                                            <div className="task-infoNB">
                                                <p><strong>Name:</strong> {task.taskName}</p>
                                                <p><strong>Description:</strong> {task.taskDescription}</p>
                                                <p><strong>Start
                                                    Date:</strong> {task.taskStartDate ? new Date(task.taskStartDate).toLocaleDateString() : 'Not Set'}
                                                </p>
                                                <p><strong>Due
                                                    Date:</strong> {task.taskEndDate ? new Date(task.taskEndDate).toLocaleDateString() : 'Not Set'}
                                                </p>
                                                <p><strong>Estimated Date
                                                    Time:</strong> {task.taskEstimatedEndDate ? new Date(task.taskEstimatedEndDate).toLocaleDateString() : 'Not Set'}
                                                </p>
                                                <p><strong>Priority:</strong> {task.taskPriority}</p>
                                                <p><strong>Status:</strong> {formatStatus(task.status)}</p>

                                            </div>

                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p>No tasks available</p>
                            )}

                        </div>
                    </div>

                </div>
            ) : (
                <div>No project found</div>
            )}
        </div>
    );

}

export default Project;
