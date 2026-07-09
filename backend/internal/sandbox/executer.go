package sandbox

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
)

type ExecutionResult struct {
	Output          string
	Error           string
	ExecutionTimeMs int64
	Status          string
}

// RunPythonCode executes the provided Python code in a Docker container and returns the result.
func RunPythonCode(rawCode string, inputTestCase string) (*ExecutionResult, error) {
	startTime := time.Now()

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("failed to connect to docker: %v", err)
	}
	defer cli.Close()
	tempDir, err := os.MkdirTemp("", "sandbox")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)
	//make main.py to run the students code in the temperary directory
	codePath := filepath.Join(tempDir, "main.py")
	if err := os.WriteFile(codePath, []byte(rawCode), 0644); err != nil {
		return nil, fmt.Errorf("failed to write code to file: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := cli.ContainerCreate(ctx, &container.Config{
		Image: "python:3.9-alpine",
		Cmd:   []string{"python", "/app/main.py"},
		Tty:   false,
	}, &container.HostConfig{
		Binds: []string{
			tempDir + ":/app:ro",
		},
		Resources: container.Resources{
			Memory: 128 * 1024 * 1024,
		},
		NetworkMode: "none",
	}, nil, nil, "")
	if err != nil {
		return nil, fmt.Errorf("failed to create container: %w", err)
	}
	containerID := resp.ID
	defer cli.ContainerRemove(context.Background(), containerID, container.RemoveOptions{Force: true})

	if err := cli.ContainerStart(ctx, containerID, container.StartOptions{}); err != nil {
		return nil, fmt.Errorf("failed to start container: %w", err)
	}
	statusCh, errCh := cli.ContainerWait(ctx, containerID, container.WaitConditionNotRunning)
	result := &ExecutionResult{}

	select {
	case err := <-errCh:
		if err != nil {
			return nil, fmt.Errorf("error while waiting for container: %w", err)
		}
	case <-statusCh:
		result.Status = "Completed"
	case <-ctx.Done():
		result.Status = "Time Limit Exceeded"
		result.ExecutionTimeMs = 5000
		return result, nil
	}

	out, err := cli.ContainerLogs(context.Background(), containerID, container.LogsOptions{ShowStdout: true, ShowStderr: true})
	if err != nil {
		return nil, err
	}
	defer out.Close()
	var stdout, stderr bytes.Buffer
	stdcopy.StdCopy(&stdout, &stderr, out)
	result.Output = stdout.String()
	result.Error = stderr.String()
	result.ExecutionTimeMs = time.Since(startTime).Milliseconds()

	if result.Error != "" {
		result.Status = "Runtime Error"
	} else {
		result.Status = "Success"
	}

	return result, nil
}
