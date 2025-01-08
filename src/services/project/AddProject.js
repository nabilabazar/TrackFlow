import React, { useState, useEffect, useCallback } from 'react'; 
import axios from 'axios'; 
import { useAuth0 } from '@auth0/auth0-react'; 
import { useNavigate } from 'react-router-dom';
import './AddProject.css'; 
import dotsImage from './dots.png';

const AddProject = () => {
    const [projects, setProjects] = useState([]);
    const [name, setProjectName] = useState('');
    const [description, setProjectDescription] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const { isAuthenticated, getIdTokenClaims } = useAuth0();
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [visibleMenu, setVisibleMenu] = useState(null);

    const navigate = useNavigate();

    const fetchProjects = useCallback(async () => {
        if (isAuthenticated) {
            try {
                const idTokenClaims = await getIdTokenClaims();
                const idToken = idTokenClaims.__raw;
                const response = await axios.get('http://localhost:8091/api/projects', {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                    },
                });
                setProjects(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error('Error fetching projects:', error);
                setErrorMessage(error?.response?.data?.message || 'An error occurred while fetching projects.');
            }
        } else {
            setErrorMessage('You need to be authenticated to view projects.');
        }
    }, [isAuthenticated, getIdTokenClaims]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const handleCreateProject = async () => {
        if (!name || !description) {
            setErrorMessage('Both project name and description are required.');
            return;
        }

        if (isAuthenticated) {
            try {
                setLoading(true);
                setErrorMessage('');
                const idTokenClaims = await getIdTokenClaims();
                const idToken = idTokenClaims.__raw;
                const projectData = { name, description };

                await axios.post('http://localhost:8091/api/projects', projectData, {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                    },
                });

                alert('Project added successfully!');
                setProjectName('');
                setProjectDescription('');
                fetchProjects();
                setShowForm(false);
            } catch (error) {
                console.error('Error adding project:', error);
                setErrorMessage(error?.response?.data?.message || 'An error occurred while adding the project.');
            } finally {
                setLoading(false);
            }
        } else {
            setErrorMessage('You need to be authenticated to add a project.');
        }
    };

    const handleProjectClick = (project) => {
        navigate(`/project/${project.id}`);
    };

    return (
        <div className="containerNB">
            <div className="project-list-containerNB">
                <h3 className="list-headerNB">List of Projects</h3>

                <button className="create-new-btnNB" onClick={() => setShowForm(true)}>
                    Create New Project
                </button>

                <div className="projectsNB">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className="project-itemNB"
                            onClick={() => handleProjectClick(project)}
                        >
                            {/* Gradient Header with Project Name and Dots Menu */}
                            <div className="project-headerNB">
                                <h4>{project.name}</h4>
                            </div>

                            <p className="project-descriptionNB">{project.description}</p>
                            <div className="created-atNB">
                                Created at: {new Date(project.createdAt).toLocaleDateString()}
                            </div>

                            {/* Menu Dropdown (Initially hidden) */}
                            {project.menuVisible && (
                                <div className="menu-dropdownNB">
                                    <ul>
                                        <li>Edit Project</li>
                                        <li>Delete Project</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {showForm && (
                <div id="new-project-modal" className="modalNB">
                    <div className="modal-contentNB">
                        <h3>Create New Project</h3>
                        <div className="project-formNB">
                            <label>Project Name:</label>
                            <input
                                type="text"
                                placeholder="Enter Project Name"
                                value={name}
                                onChange={(e) => setProjectName(e.target.value)}
                            />
                            <label>Description:</label>
                            <textarea
                                placeholder="Enter Project Description"
                                value={description}
                                onChange={(e) => setProjectDescription(e.target.value)}
                            />
                            <button onClick={handleCreateProject} disabled={loading}>
                                {loading ? 'Creating...' : 'Create Project'}
                            </button>
                            {errorMessage && <div className="error-messageNB">{errorMessage}</div>}
                            <button className="close-btnNB" onClick={() => setShowForm(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddProject;
