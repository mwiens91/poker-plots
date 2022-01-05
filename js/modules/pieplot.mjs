// Based off this link
// https://www.d3-graph-gallery.com/graph/donut_label.html

// Function to draw pie chart. Returns a redraw function
const drawPiePlot = (playerData, divId, maxWidth, margin) => {
  // Display options - radii factors are fractions of max radius
  const innerRadiusFactor = 0.5;
  const outerRadiusFactor = 0.8;
  const textRadiusFactor = 0.9;

  // Initialise a formatter for displaying currency
  const parseCurrency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  // Make the SVG
  const svg = d3.select("#" + divId).append("svg");

  // Bake the pie
  const pie = d3.pie().value((d) => Math.abs(d.cumSum));
  const bakedData = pie(playerData);

  // Compute total cumulative sums (for tooltip)
  const cumSumTotal = playerData.reduce(
    (tot, player) => tot + player.cumSum,
    0
  );

  // Tooltip stuff
  const tooltip = d3
    .select("#" + divId)
    .append("div")
    .style("opacity", 0)
    .style("position", "absolute")
    .attr("class", "tooltip");
  const tooltipMousemove = (event, d) =>
    tooltip
      .style("left", event.pageX + 70 + "px")
      .style("top", event.pageY + "px");
  const tooltipMouseout = (event, d) => tooltip.style("opacity", 0);
  const tooltipMouseover = (event, d) =>
    tooltip
      .style("opacity", 0.8)
      .html(
        `cumulative sum: ${parseCurrency.format(d.data.cumSum)}<br>` +
          `percent total ${d.data.cumSum > 0 ? "winnings" : "losses"}: ${
            Math.round((d.data.cumSum / cumSumTotal) * 100 * 10) / 10
          }%`
      );

  // Function to draw plot
  const drawGraph = () => {
    // Sizes
    const width = Math.min(
      maxWidth,
      document.getElementById(divId).clientWidth
    );
    const height = width;
    const maxRadius =
      Math.min(
        width - margin.left - margin.right,
        height - margin.top - margin.bottom
      ) / 2;

    // Make SVG ... G
    const svgG = svg
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
        "translate(" +
          (width + margin.left + margin.right) / 2 +
          "," +
          (height + margin.top + margin.bottom) / 2 +
          ")"
      );

    // Generate arcs
    const arc = d3
      .arc()
      .innerRadius(maxRadius * innerRadiusFactor)
      .outerRadius(maxRadius * outerRadiusFactor);
    const textArc = d3
      .arc()
      .innerRadius(maxRadius * textRadiusFactor)
      .outerRadius(maxRadius * textRadiusFactor);

    // Draw the pie chart
    const arcs = svgG.selectAll("g.slice").data(bakedData).enter().append("g");

    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => d.data.colourHex)
      .attr("stroke", "white")
      .style("stroke-width", "2px")
      .style("opacity", 0.7)
      .on("mouseover", tooltipMouseover)
      .on("mousemove", tooltipMousemove)
      .on("mouseout", tooltipMouseout);

    // Draw labels
    const getMidAngle = (d) => d.startAngle + (d.endAngle - d.startAngle) / 2;

    arcs
      .append("polyline")
      .attr("stroke", "black")
      .style("fill", "none")
      .attr("stroke-width", 1)
      .attr("points", function (d) {
        // Line out of inner circle to text circle
        const posA = arc.centroid(d);
        const posB = textArc.centroid(d);

        // Line to label
        let posC = textArc.centroid(d);

        // Position based on left or right depending on position of
        // first line
        posC[0] = maxRadius * 0.95 * (getMidAngle(d) < Math.PI ? 1 : -1);

        return [posA, posB, posC];
      })
      .on("mouseover", tooltipMouseover)
      .on("mousemove", tooltipMousemove)
      .on("mouseout", tooltipMouseout);

    arcs
      .append("text")
      .attr("transform", (d) => {
        const pos = textArc.centroid(d);

        pos[0] = maxRadius * 0.99 * (getMidAngle(d) < Math.PI ? 1 : -1);

        return "translate(" + pos + ")";
      })
      .style("text-anchor", (d) => (getMidAngle(d) < Math.PI ? "start" : "end"))
      .text((d) => d.data.name)
      .on("mouseover", tooltipMouseover)
      .on("mousemove", tooltipMousemove)
      .on("mouseout", tooltipMouseout);
  };

  // Call graph drawing function
  drawGraph();

  // Return function to redraw graph
  return () => {
    svg.selectAll("*").remove();
    drawGraph();
  };
};

export { drawPiePlot };