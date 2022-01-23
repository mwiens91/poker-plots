// Credit for the basis of this code goes to Zakaria Chowdhury here:
// https://codepen.io/zakariachowdhury/pen/JEmjwq

// Function to draw multi-line plot. Returns a redraw function.
const drawLinePlot = (data, divId, maxWidth, margin) => {
  // Tweak display settings
  const lineOpacity = 0.6;
  const lineOpacityHover = 0.85;
  const otherLinesOpacityHover = 0.15;
  const lineStroke = "0.1rem";
  const lineStrokeHover = "0.15rem";

  const circleOpacity = 0.85;
  const circleOpacityOnLineHover = 0.6;
  const circleRadius = "0.2em";
  const circleRadiusHover = "0.4em";

  // Whether to show time series or to show game data in a (non-time)
  // series
  let useTimeSeries = true;
  const getXVal = (d) => (useTimeSeries ? d.date : d.id);

  // Initialise a formatter for displaying currency
  const parseCurrency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  // Initialise a formatter for displaying dates
  const parseDate = d3.utcParse("%Y-%m-%d");

  // Parse dates in player data
  const playersNew = data.players.map((player) => ({
    ...player,
    data: player.data.map((datum) => ({
      ...datum,
      date: parseDate(datum.date),
    })),
  }));

  // Dates for x-axis
  const allDates = playersNew
    .map((player) => player.data.map((v) => v.date))
    .flat();
  const minDate = d3.min(allDates);
  let lowerDate = new Date(Number(minDate));
  lowerDate.setDate(minDate.getDate() - 1); // this is possibly not robust?

  // Sizes
  let width = Math.min(maxWidth, document.getElementById(divId).clientWidth);
  let height = 0.5 * width;

  // Min/max zoom
  const minZoomTimeSeries = 0.7;
  const minZoomSerialized = 0.7;

  // For time series, we want the max zoom to show a given number of
  // dates; similarly, for serialized, we want the max zoom to show a
  // given number of games
  const maxDate = d3.max(allDates);
  const maxGameId = d3.max(data.games.map((game) => game.id));

  const maxDaysToShow = 14;
  const maxGamesToShow = 10;

  const maxZoomTimeSeries = Math.max(
    1,
    (maxDate.getTime() - minDate.getTime()) / (maxDaysToShow * 1000 * 3600 * 24)
  );
  const maxZoomSerialized = Math.max(1, (maxGameId - 1) / maxGamesToShow);

  // x-scale - start slightly before the first data point
  let xScale = (useTimeSeries ? d3.scaleUtc : d3.scaleLinear)()
    .domain(useTimeSeries ? [lowerDate, maxDate] : [0.9, maxGameId])
    .range([0, width - margin.left - margin.right]);
  let xScaleCopy = xScale.copy();

  // y-scale
  const yScale = d3
    .scaleLinear()
    .domain(
      d3
        .extent(
          playersNew.map((player) => player.data.map((v) => v.cumSum)).flat()
        )
        .map((x) => 1.05 * x)
    )
    .range([height - margin.top - margin.bottom, 0]);

  // Make the SVG
  const svg = d3.select("#" + divId).append("svg");

  // Function to draw plot
  const drawGraph = () => {
    // Make the SVG... G
    const svgG = svg
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr(
        "viewBox",
        "0 0 " +
          (width + margin.left + margin.right) +
          " " +
          (height + margin.top + margin.bottom)
      )
      .append("g")
      .attr(
        "transform",
        `translate(${margin.left + margin.right}, ${
          margin.top + margin.bottom
        })`
      );

    // Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
      .axisLeft(yScale)
      .tickFormat((d) => parseCurrency.format(d))
      .ticks(10);

    // Grids
    const yAxisGrid = d3
      .axisLeft(yScale)
      .tickSize(margin.left + margin.right - width)
      .tickFormat("")
      .ticks(10)
      .tickSizeOuter(0);

    // Draw grids first, then axes
    svgG.append("g").attr("class", "y axis-grid").call(yAxisGrid);

    const xAxisG = svgG
      .append("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
      .call(xAxis);

    svgG
      .append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("y", 15)
      .attr("transform", "rotate(-90)")
      .attr("fill", "#000")
      .text("cumulative sum (CAD)");

    // Add a clipPath: everything out of this area won't be drawn
    const clip = svgG
      .append("defs")
      .append("svg:clipPath")
      .attr("id", "clip")
      .append("svg:rect")
      .attr("width", width)
      .attr("height", height)
      .attr("x", 0)
      .attr("y", 0);

    // Use the clipPath to define the drawing area
    const drawArea = svgG.append("g").attr("clip-path", "url(#clip)");

    // Line function
    const line = d3
      .line()
      .x((d) => xScale(getXVal(d)))
      .y((d) => yScale(d.cumSum));

    // Line plot info bar elements
    const infoBarAvatarDivElement = d3.select("#line-plot-avatar-div");
    const infoBarPlayerDivElement = d3.select("#line-plot-player-div");
    const infoBarGameDivElement = d3.select("#line-plot-game-div");
    const infoBarAvatarElement = d3.select("#line-plot-avatar");
    const infoBarPlayerTitleElement = d3.select("#line-plot-player");
    const infoBarPlayerAmountElement = d3.select("#line-plot-amount");
    const infoBarGameTitleElement = d3.select("#line-plot-game-title");
    const infoBarGameInfoElement = d3.select("#line-plot-game-info");

    // Add lines
    let lines = drawArea.append("g").attr("class", "lines");

    lines
      .selectAll(".line-group")
      .data(playersNew)
      .enter()
      .append("g")
      .attr("class", "line-group")
      .append("path")
      .attr("class", "line")
      .attr("d", (d) => line(d.data))
      .style("stroke", (d) => d.colourHex)
      .style("stroke-width", lineStroke)
      .style("opacity", lineOpacity)
      .on("mouseover", (event, d) => {
        d3.selectAll(".line").style("opacity", otherLinesOpacityHover);
        d3.selectAll(".circle").style("opacity", circleOpacityOnLineHover);
        d3.select(event.currentTarget)
          .style("opacity", lineOpacityHover)
          .style("stroke-width", lineStrokeHover)
          .style("cursor", "pointer");

        infoBarAvatarDivElement.style("background", "rgb(" + d.colourRgb + ")");
        infoBarPlayerDivElement.style(
          "background",
          "rgb(" + d.colourRgb.map((x) => x + (255 - x) * 0.4) + ")"
        );
        infoBarAvatarElement.attr("src", d.avatar);
        infoBarPlayerTitleElement.text(d.name);
        infoBarPlayerAmountElement.text(parseCurrency.format(d.cumSum));
      })
      .on("mouseout", (event, d) => {
        d3.selectAll(".line").style("opacity", lineOpacity);
        d3.selectAll(".circle").style("opacity", circleOpacity);
        d3.select(event.currentTarget)
          .style("stroke-width", lineStroke)
          .style("cursor", "none");
      });

    // Add datapoints to lines
    lines
      .selectAll("circle-group")
      .data(playersNew)
      .enter()
      .append("g")
      .style("fill", (d) => d.colourHex)
      .selectAll("circle")
      .data((d) => d.data)
      .enter()
      .append("g")
      .attr("class", "circle")
      .append("circle")
      .attr("cx", (d) => xScale(getXVal(d)))
      .attr("cy", (d) => yScale(d.cumSum))
      .attr("r", circleRadius)
      .style("opacity", circleOpacity)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .attr("r", circleRadiusHover);

        const player = playersNew.filter((x) => x.name === d.player)[0];

        infoBarAvatarDivElement.style(
          "background",
          "rgb(" + player.colourRgb + ")"
        );
        infoBarPlayerDivElement.style(
          "background",
          "rgb(" + player.colourRgb.map((x) => x + (255 - x) * 0.4) + ")"
        );
        infoBarAvatarElement.attr("src", player.avatar);
        infoBarPlayerTitleElement.text(player.name);
        infoBarPlayerAmountElement.text(parseCurrency.format(player.cumSum));

        infoBarGameDivElement.style(
          "background",
          "rgb(" + player.colourRgb.map((x) => x + (255 - x) * 0.8) + ")"
        );
        infoBarGameTitleElement.text(
          d.date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        );
        infoBarGameInfoElement.text(
          "buy-in: " +
            parseCurrency.format(d.buyin) +
            ", buy-out: " +
            parseCurrency.format(d.buyout) +
            ", net: " +
            parseCurrency.format(d.delta) +
            ", cum-sum: " +
            parseCurrency.format(d.cumSum)
        );
      })
      .on("mouseout", (event, d) => {
        d3.select(event.currentTarget).transition().attr("r", circleRadius);
        infoBarGameDivElement.style("background", "#FFFFFF");
        infoBarGameTitleElement.text("");
        infoBarGameInfoElement.text("");
      })
      .on("click", (event, d) =>
        document.getElementById("game-" + d.id).scrollIntoView()
      );

    // Zooming and axis transition
    const zoomed = ({ transform }) => {
      // Axis
      xScale = transform.rescaleX(xScaleCopy);
      xAxis.scale(xScale);
      xAxisG.call(xAxis);

      // Lines and data points
      drawArea.selectAll("circle").attr("cx", (d) => xScale(getXVal(d)));
      drawArea.selectAll("path").attr("d", (d) => line(d.data));
    };

    const zoom = d3
      .zoom()
      .scaleExtent(
        useTimeSeries
          ? [minZoomTimeSeries, maxZoomTimeSeries]
          : [minZoomSerialized, maxZoomSerialized]
      )
      .on("zoom", zoomed);

    const transitionXAxis = () => {
      // Change from time series to serializes (or vise versa)
      useTimeSeries = useTimeSeries ? false : true;

      // Scale
      xScale = (useTimeSeries ? d3.scaleUtc : d3.scaleLinear)()
        .domain(useTimeSeries ? [lowerDate, maxDate] : [0.9, maxGameId])
        .range([0, width - margin.left - margin.right]);
      xScaleCopy = xScale.copy();

      // Zoom scale
      useTimeSeries
        ? zoom.scaleExtent([minZoomTimeSeries, maxZoomTimeSeries])
        : zoom.scaleExtent([minZoomSerialized, maxZoomSerialized]);

      // Axis
      xAxis.scale(xScale);
      xAxisG.transition().call(xAxis);

      // Lines and data points
      drawArea
        .selectAll("circle")
        .transition()
        .attr("cx", (d) => xScale(getXVal(d)));
      drawArea
        .selectAll("path")
        .transition()
        .attr("d", (d) => line(d.data))
        .on("end", () => svg.call(zoom.transform, d3.zoomIdentity));
    };

    svg.call(zoom).on("dblclick.zoom", null).on("dblclick", transitionXAxis);

    // Add mouseover events for player cards
    for (const player of playersNew) {
      const playerCardElement = document.getElementById(
        "player-card-" + player.name
      );

      playerCardElement.addEventListener("mouseover", (event) => {
        d3.selectAll(".line").style("opacity", otherLinesOpacityHover);
        d3.selectAll(".circle").style("opacity", circleOpacityOnLineHover);

        lines
          .selectAll("path")
          .filter((d) => d.name === player.name)
          .style("opacity", lineOpacityHover)
          .style("stroke-width", lineStrokeHover);

        infoBarAvatarDivElement.style(
          "background",
          "rgb(" + player.colourRgb + ")"
        );
        infoBarPlayerDivElement.style(
          "background",
          "rgb(" + player.colourRgb.map((x) => x + (255 - x) * 0.4) + ")"
        );
        infoBarAvatarElement.attr("src", player.avatar);
        infoBarPlayerTitleElement.text(player.name);
        infoBarPlayerAmountElement.text(parseCurrency.format(player.cumSum));
      });
      playerCardElement.addEventListener("mouseout", (event) => {
        d3.selectAll(".line").style("opacity", lineOpacity);
        d3.selectAll(".circle").style("opacity", circleOpacity);

        lines
          .selectAll("path")
          .filter((d) => d.name === player.name)
          .style("stroke-width", lineStroke)
          .style("cursor", "none");
      });
    }
  };

  // Call graph drawing function
  drawGraph();

  // Return function to redraw graph
  return () => {
    // Reset sizes
    width = Math.min(maxWidth, document.getElementById(divId).clientWidth);
    height = 0.5 * width;

    // Update scales
    xScale.range([0, width - margin.left - margin.right]);
    yScale.range([height - margin.top - margin.bottom, 0]);

    // Remove everything and redraw
    svg.selectAll("*").remove();
    drawGraph();
  };
};

export { drawLinePlot };
