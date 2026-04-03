FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["SignalApp.API/SignalApp.API/SignalApp.API.csproj", "SignalApp.API/SignalApp.API/"]
RUN dotnet restore "SignalApp.API/SignalApp.API/SignalApp.API.csproj"
COPY . .
WORKDIR "/src/SignalApp.API/SignalApp.API"
RUN dotnet build "SignalApp.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "SignalApp.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "SignalApp.API.dll"]
