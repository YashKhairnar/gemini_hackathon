from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from typing import List
from tools.file_creator_tool import FileCreatorTool
# If you want to run a snippet of code before or after the crew starts,
# you can use the @before_kickoff and @after_kickoff decorators
# https://docs.crewai.com/concepts/crews#example-crew-class-with-decorators

@CrewBase
class Agentapp():
    """Agentapp crew"""
    agents: List[BaseAgent]
    tasks: List[Task]

    # Learn more about YAML configuration files here:
    # Agents: https://docs.crewai.com/concepts/agents#yaml-configuration-recommended
    # Tasks: https://docs.crewai.com/concepts/tasks#yaml-configuration-recommended
    
    # If you would like to add tools to your agents, you can learn more about it here:
    # https://docs.crewai.com/concepts/agents#agent-tools
    @agent
    def orchestrator_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['orchestrator_agent'], # type: ignore[index]
            verbose=True
        )

    @agent
    def frontend_agent(self)->Agent:
        return Agent(
            config=self.agents_config['frontend_agent'], # type: ignore[index]
            verbose=True,
            tools=[FileCreatorTool()]  # Enable file creation tool
        )
    
    @agent
    def backend_agent(self)->Agent:
        return Agent(
            config=self.agents_config['backend_agent'], # type: ignore[index]
            verbose=True,
            tools=[FileCreatorTool()]  # Enable file creation tool
        )
    
    @agent
    def qa_tester_agent(self)->Agent:
        return Agent(
            config=self.agents_config['qa_tester_agent'], # type: ignore[index]
            verbose=True
        )


    # To learn more about structured task outputs,
    # task dependencies, and task callbacks, check out the documentation:
    # https://docs.crewai.com/concepts/tasks#overview-of-a-task
    @task
    def decompose_task(self) -> Task:
        return Task(
            config=self.tasks_config['decompose_task'], # type: ignore[index]
        )

    @task
    def frontend_coding_task(self) -> Task:
        return Task(
            config=self.tasks_config['frontend_coding_task'], # type: ignore[index]
        )
    
    @task
    def backend_coding_task(self) -> Task:
        return Task(
            config=self.tasks_config['backend_coding_task'], # type: ignore[index]
        )
    
    @task
    def final_qa_validation_task(self) -> Task:
        return Task(
            config=self.tasks_config['final_qa_validation_task'], # type: ignore[index]
        )  


    @crew
    def crew(self) -> Crew:
        """Creates the Agentapp crew"""
        # To learn how to add knowledge sources to your crew, check out the documentation:
        # https://docs.crewai.com/concepts/knowledge#what-is-knowledge
        
        # Get agent instances by calling the methods (decorator converts them to callables)
        frontend = self.frontend_agent()
        backend = self.backend_agent()
        qa = self.qa_tester_agent()
        orchestrator = self.orchestrator_agent()
        
        return Crew(
            agents=[frontend, backend, qa], # Worker agents
            tasks=self.tasks, # Automatically created by the @task decorator
            process=Process.hierarchical,
            manager_agent=orchestrator, # Manager agent
            verbose=True
        )
