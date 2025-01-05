import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const JoinProject = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated, getIdTokenClaims } = useAuth0();

    useEffect(() => {
        const joinProject = async () => {
            const searchParams = new URLSearchParams(location.search);
            const token = searchParams.get('token');

            if (!token) {
                setError('No invitation token found');
                setLoading(false);
                return;
            }

            if (!isAuthenticated) {
                setError('You must be logged in to join a project');
                setLoading(false);
                return;
            }

            try {
                const idTokenClaims = await getIdTokenClaims();
                const idToken = idTokenClaims.__raw;

                const response = await axios.post(
                    'http://localhost:8091/api/projectmembers/join',
                    null,
                    {
                        params: { token },
                        headers: {
                            'Authorization': `Bearer ${idToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                console.log('Joined project:', response.data);
                navigate(`/project/${response.data.id}`);
            } catch (error) {
                console.error('Error joining project:', error.response ? error.response.data : error.message);
                setError(error.response?.data || 'Failed to join project');
                setLoading(false);
            }
        };

        if (isAuthenticated) {
            joinProject();
        }
    }, [isAuthenticated, location.search, navigate]);

    if (loading) return <div>Joining project...</div>;
    if (error) return <div>Error: {error}</div>;

    return null;
};

export default JoinProject;
