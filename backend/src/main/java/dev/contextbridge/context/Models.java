package dev.contextbridge.context;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class Models {
    private Models() {}
    public record Project(UUID id, String slug, String name, String description, String repositoryUrl,
                          String summary, long revision, Instant createdAt, Instant updatedAt) {}
    public record Entry(UUID id, UUID projectId, String kind, String title, String content,
                        String environment, String branch, String gitCommit, String author,
                        long revision, UUID requestId, Instant createdAt) {}
    public record ProjectContext(Project project, List<Entry> entries, String nextCursor) {}
    public record CreateProject(
            @NotBlank @Size(max=80) @Pattern(regexp="[a-z0-9]+(?:-[a-z0-9]+)*") String slug,
            @NotBlank @Size(max=120) String name,
            @NotNull @Size(max=1000) String description,
            @NotNull @Size(max=500) @Pattern(regexp="^$|https?://[^\\s]+|git@[^\\s]+") String repositoryUrl) {}
    public record UpdateProject(@NotBlank @Size(max=120) String name,
            @NotNull @Size(max=1000) String description,
            @NotNull @Size(max=500) @Pattern(regexp="^$|https?://[^\\s]+|git@[^\\s]+") String repositoryUrl,
            @NotNull @Size(max=30000) String summary, @Min(0) long expectedRevision) {}
    public record CreateEntry(@NotBlank @Pattern(regexp="CHECKPOINT|DECISION|NOTE") String kind,
            @NotBlank @Size(max=160) String title, @NotBlank @Size(max=30000) String content,
            @NotNull @Size(max=100) String environment, @NotNull @Size(max=200) String branch,
            @NotNull @Size(max=64) String gitCommit, @Min(0) long expectedRevision,
            @NotNull UUID requestId) {}
}
