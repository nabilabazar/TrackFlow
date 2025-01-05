package TrackFlow.TaskManagement.service;

import TrackFlow.TaskManagement.model.Task;
import TrackFlow.TaskManagement.model.Task.Status;
import TrackFlow.TaskManagement.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TaskService {

    public enum Status {
        NOT_STARTED, IN_PROGRESS, COMPLETED
    }

    private final TaskRepository taskRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final RestTemplate restTemplate;
    private final String projectServiceUrl = "http://localhost:8091/api/projects"; // Replace with actual URL

    @Autowired
    public TaskService(TaskRepository taskRepository, SimpMessagingTemplate messagingTemplate, RestTemplate restTemplate) {
        this.taskRepository = taskRepository;
        this.messagingTemplate = messagingTemplate;
        this.restTemplate = restTemplate;
    }


    public Task createTask(Task task) {
        validateProjectId(task.getProjectId());
        task.setCreatedAt(LocalDateTime.now());
        taskRepository.save(task);
        sendKpiUpdateToFrontend(task);
        return task;
    }

    public Task updateTask(Long taskId, Task taskDetails) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        validateProjectId(taskDetails.getProjectId());

        task.setTaskName(taskDetails.getTaskName());
        task.setTaskDescription(taskDetails.getTaskDescription());
        task.setTaskStartDate(taskDetails.getTaskStartDate());
        task.setTaskEndDate(taskDetails.getTaskEndDate());
        task.setTaskPriority(taskDetails.getTaskPriority());
        task.setStatus(taskDetails.getStatus());
        task.setTaskEstimatedEndDate(taskDetails.getTaskEstimatedEndDate());
        task.setAssignedUsers(taskDetails.getAssignedUsers());

        taskRepository.save(task);
        sendKpiUpdateToFrontend(task);

        return task;
    }


    public void deleteTask(Long taskId) {
        taskRepository.deleteById(taskId);
        sendKpiUpdateToFrontend(taskId);
    }

    public Task getTaskById(Long taskId) {
        return taskRepository.findById(taskId).orElse(null);
    }

    public List<Task> getTasksByProjectId(Long projectId) {
        validateProjectId(projectId);
        return taskRepository.findByProjectId(projectId);
    }

    public Map<String, Object> countAllTasksByUserId(String userId) {
        int allTasks = taskRepository.countAllTasksByUserId(userId);
        int completedTasks = taskRepository.countCompletedTasksByUserId(userId);
        int incompleteTasks = taskRepository.countIncompleteTasksByUserId(userId);
        List<Object[]> tasksByStatus = taskRepository.countTasksByStatus(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("userId", userId);
        response.put("allTasks", allTasks);
        response.put("completedTasks", completedTasks);
        response.put("incompleteTasks", incompleteTasks);

        Map<String, Integer> statusCounts = new HashMap<>();
        for (Object[] entry : tasksByStatus) {
            String status = (String) entry[0];
            Integer count = ((Number) entry[1]).intValue();
            statusCounts.put(status, count);
        }
        response.put("tasksByStatus", statusCounts);

        return response;
    }

    public Map<String, Object> countParameters(Long projectId) {
        validateProjectId(projectId);

        List<Object[]> cycleTime = taskRepository.findTaskIdAndCycleTimeByProjectId(projectId);
        Long tasksByProjectId = taskRepository.countTasksByProjectId(projectId);
        Long onTimeTasks = taskRepository.countOnTimeTasksByProjectId(projectId);
        Long completedTasksByProjectId = taskRepository.countCompletedTasksByProjectId(projectId);

        Map<String, Object> response = new HashMap<>();
        response.put("projectId", projectId);
        response.put("tasksByProjectId", tasksByProjectId);
        response.put("onTimeTasks", onTimeTasks);
        response.put("completedTaskByProjectId", completedTasksByProjectId);

        Map<Long, Integer> cycleTimemap = new HashMap<>();
        for (Object[] entry : cycleTime) {
            Long taskId = (Long) entry[0];
            Integer cycleTimeValue = (Integer) entry[1];
            cycleTimemap.put(taskId, cycleTimeValue);
        }
        response.put("cycleTime", cycleTimemap);

        return response;
    }

    private void validateProjectId(Long projectId) {
        try {
            ResponseEntity<Void> response = restTemplate.exchange(
                    projectServiceUrl + "/{projectId}", HttpMethod.GET, null, Void.class, projectId);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Invalid Project ID: " + projectId);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to validate Project ID: " + projectId, e);
        }
    }

    private void sendKpiUpdateToFrontend(Object task) {
        messagingTemplate.convertAndSend("/topic/kpiUpdates", task);
    }
    
}
