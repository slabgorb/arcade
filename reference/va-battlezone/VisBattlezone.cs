/*
 * Copyright 2020 faddenSoft
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
using System;
using System.Collections.ObjectModel;

using PluginCommon;

namespace Battlezone {
    /// <summary>
    /// Visualizer for Battlezone meshes.  These are specified in two independent tables,
    /// one with vertices, one with drawing instructions.
    ///
    /// Also includes a crude battlefield map renderer.
    /// </summary>
    public class BattlezoneMesh : MarshalByRefObject, IPlugin, IPlugin_Visualizer_v2 {
        // IPlugin
        public string Identifier {
            get { return "Battlezone Mesh Visualizer"; }
        }
        private IApplication mAppRef;
        private byte[] mFileData;
        private AddressTranslate mAddrTrans;

        // Visualization identifiers; DO NOT change or projects that use them will break.
        private const string VIS_GEN_BATTLEZONE_MESH = "battlezone-mesh";
        private const string VIS_GEN_BATTLEZONE_MAP = "battlezone-map";

        private const string P_VTAB_OFFSET = "vtabOffset";
        private const string P_CTAB_OFFSET = "ctabOffset";
        private const string P_TABLE_INDEX = "tableIndex";

        private const string P_MAP_T_F_OFFSET = "mapTFOffset";
        private const string P_MAP_X_OFFSET = "mapXOffset";
        private const string P_MAP_Z_OFFSET = "mapZOffset";

        // Visualization descriptors.
        private VisDescr[] mDescriptors = new VisDescr[] {
            new VisDescr(VIS_GEN_BATTLEZONE_MESH, "Battlezone Mesh", VisDescr.VisType.Wireframe,
                new VisParamDescr[] {
                    new VisParamDescr("Vertex tbl offset (hex)",
                        P_VTAB_OFFSET, typeof(int), 0, 0x00ffffff,
                        VisParamDescr.SpecialMode.Offset, 0x388e),
                    new VisParamDescr("Cmd tbl offset (hex)",
                        P_CTAB_OFFSET, typeof(int), 0, 0x00ffffff,
                        VisParamDescr.SpecialMode.Offset, 0x2472),

                    new VisParamDescr("Shape index",
                        P_TABLE_INDEX, typeof(int), 0, 43, 0, 0),
                }),
            new VisDescr(VIS_GEN_BATTLEZONE_MAP, "Battlezone Map", VisDescr.VisType.Bitmap,
                new VisParamDescr[] {
                    new VisParamDescr("T/F offset (hex)",
                        P_MAP_T_F_OFFSET, typeof(int), 0, 0x00ffffff, VisParamDescr.SpecialMode.Offset, 0x3fcc),
                    new VisParamDescr("X offset (hex)",
                        P_MAP_X_OFFSET, typeof(int), 0, 0x00ffffff, VisParamDescr.SpecialMode.Offset, 0x2681),
                    new VisParamDescr("Z offset (hex)",
                        P_MAP_Z_OFFSET, typeof(int), 0, 0x00ffffff, VisParamDescr.SpecialMode.Offset, 0x26ab),
                }),
        };


        // IPlugin
        public void Prepare(IApplication appRef, byte[] fileData, AddressTranslate addrTrans) {
            mAppRef = appRef;
            mFileData = fileData;
            mAddrTrans = addrTrans;
        }

        // IPlugin
        public void Unprepare() {
            mAppRef = null;
            mFileData = null;
            mAddrTrans = null;
        }

        // IPlugin_Visualizer
        public VisDescr[] GetVisGenDescrs() {
            if (mFileData == null) {
                return null;
            }
            return mDescriptors;
        }

        // IPlugin_Visualizer
        public IVisualization2d Generate2d(VisDescr descr,
                ReadOnlyDictionary<string, object> parms) {
            switch (descr.Ident) {
                case VIS_GEN_BATTLEZONE_MAP:
                    return GenerateMap(parms);
                default:
                    mAppRef.ReportError("Unknown ident " + descr.Ident);
                    return null;
            }
        }

        // IPlugin_Visualizer_v2
        public IVisualizationWireframe GenerateWireframe(VisDescr descr,
                ReadOnlyDictionary<string, object> parms) {
            switch (descr.Ident) {
                case VIS_GEN_BATTLEZONE_MESH:
                    return GenerateWireframe(parms);
                default:
                    mAppRef.ReportError("Unknown ident " + descr.Ident);
                    return null;
            }
        }

        private IVisualizationWireframe GenerateWireframe(ReadOnlyDictionary<string, object> parms) {
            int voffset = Util.GetFromObjDict(parms, P_VTAB_OFFSET, 0);
            int coffset = Util.GetFromObjDict(parms, P_CTAB_OFFSET, 0);
            int index = Util.GetFromObjDict(parms, P_TABLE_INDEX, 0);

            if (voffset < 0 || voffset >= mFileData.Length ||
                    coffset < 0 || coffset >= mFileData.Length) {
                // should be caught by editor
                mAppRef.ReportError("Invalid parameter");
                return null;
            }

            VisWireframe vw = new VisWireframe();
            try {
                int vertexAddr = mFileData[voffset + index * 2] |
                    (mFileData[voffset + index * 2 + 1] << 8);
                int cmdAddr = mFileData[coffset + index * 2] |
                    (mFileData[coffset + index * 2 + 1] << 8);

                // There are two un-filled entries (34/35).
                if (vertexAddr == 0 || cmdAddr == 0) {
                    mAppRef.ReportError("No shape at this index");
                    return null;
                }

                int vertexOffset = mAddrTrans.AddressToOffset(voffset, vertexAddr);
                if (vertexOffset < 0) {
                    mAppRef.ReportError("Invalid vertex address $" + vertexAddr.ToString("x4"));
                    return null;
                }
                int cmdOffset = mAddrTrans.AddressToOffset(coffset, cmdAddr);
                if (cmdOffset < 0) {
                    mAppRef.ReportError("Invalid cmd address $" + cmdAddr.ToString("x4"));
                    return null;
                }

                int vertexSize = mFileData[vertexOffset++] - 1;

                for (int i = 0; i < vertexSize; i += 6) {
                    int zc = (short)Util.GetWord(mFileData, vertexOffset + i + 0, 2, false);
                    int xc = -(short)Util.GetWord(mFileData, vertexOffset + i + 2, 2, false);
                    int yc = (short)Util.GetWord(mFileData, vertexOffset + i + 4, 2, false);

                    // The math box halves X/Z, so the mesh definitions have doubled values.
                    // Absolute values don't matter to us, so we can halve X/Z or double Y.
                    // I don't see any odd-valued X/Z coords or ready-to-overflow Y coords,
                    // so either way should work.
                    yc *= 2;

                    vw.AddVertex(xc, yc, zc);

                    //mAppRef.DebugLog("v" + (i/6).ToString("D2") +
                    //    ": xc=" + xc + " yc=" + yc + " zc=" + zc);
                }

                // Add a fake vertex for the center point, which is where the beam starts.
                int centerVertex = vw.AddVertex(0, 0, 0);

                // The number of vertices in the original shape is equal to the index
                // of the last vertex added + 1.  Since we just added another vertex,
                // it's equal to that.
                int numVertices = centerVertex;

                // Current beam position.
                int curVertex = centerVertex;

                while (cmdOffset < mFileData.Length) {
                    byte val = mFileData[cmdOffset];
                    if (val == 0xff) {
                        // stop symbol found
                        break;
                    }
                    int vindex = val >> 3;
                    int cmd = val & 0x07;

                    // Check vertex validity.
                    if (vindex >= numVertices && cmd != 1 && cmd != 5) {
                        mAppRef.ReportError("Invalid vertex ref in data (vindex=" +
                            vindex + " max=" + numVertices + " cmd=" + cmd +
                            " at +" + cmdOffset.ToString("x6") + ")");
                        return null;
                    }
                    //mAppRef.DebugLog("CMD " + cmd + " vi=" + vindex);

                    switch (cmd) {
                        case 0:
                            // move to vertex, draw point
                            curVertex = vindex;
                            vw.AddPoint(vindex);
                            break;
                        case 1:
                            // set intensity; some type-specific behavior, but may use
                            // the vertex index value
                            break;
                        case 2:
                            // move to vertex without drawing
                            curVertex = vindex;
                            break;
                        case 3:
                            // move to center of screen, then move to vertex without drawing
                            curVertex = vindex;
                            break;
                        case 4:
                            // draw with intensity=1 (uses value from STAT)
                            vw.AddEdge(curVertex, vindex);
                            curVertex = vindex;
                            break;
                        case 5:
                            // draw scaled shape from $347A
                            // (this is used for projectile explosions, which are a single
                            // vertex in 3D space that determines the screen X/Y to use as
                            // the center for a scaled AVG dot pattern)
                            //mAppRef.DebugLog("Found draw-scaled-347a in " + index);
                            break;
                        case 6:
                            // no-op
                            break;
                        case 7:
                            // no such thing
                            mAppRef.ReportError("Found invalid draw cmd 7 in " + index);
                            break;
                    }

                    cmdOffset++;
                }
            } catch (IndexOutOfRangeException) {
                // assume it was our file data access that caused the failure
                mAppRef.ReportError("Ran off end of file");
                return null;
            }

            string msg;
            if (!vw.Validate(out msg)) {
                mAppRef.ReportError("Data error: " + msg);
                return null;
            }

            return vw;
        }

        private IVisualization2d GenerateMap(ReadOnlyDictionary<string, object> parms) {
            int tfOffset = Util.GetFromObjDict(parms, P_MAP_T_F_OFFSET, 0);
            int xOffset = Util.GetFromObjDict(parms, P_MAP_X_OFFSET, 0);
            int zOffset = Util.GetFromObjDict(parms, P_MAP_Z_OFFSET, 0);

            if (tfOffset < 0 || tfOffset >= mFileData.Length ||
                    xOffset < 0 || xOffset >= mFileData.Length ||
                    zOffset < 0 || zOffset >= mFileData.Length) {
                mAppRef.ReportError("Invalid parameter");
                return null;
            }

            VisBitmap8 vb = new VisBitmap8(256, 256);
            vb.AddColor(0xff, 0x00, 0x00, 0x00);        // 0 black background
            vb.AddColor(0xff, 0xc0, 0x40, 0xc0);        // 1 purple-ish (narrow pyramid)
            vb.AddColor(0xff, 0x40, 0xe0, 0x40);        // 2 green-ish (tall box)
            vb.AddColor(0xff, 0x40, 0x40, 0xe0);        // 3 blue-ish (wide pyramid)
            vb.AddColor(0xff, 0xe0, 0x40, 0x40);        // 4 red-ish (short box)
            vb.AddColor(0xff, 0xff, 0xff, 0xff);        // 5 white

            // We draw to bottom/right of coordinates, but our top/left edge is pretty empty, so
            // just shift everything over so it fits better.
            int xshift = -10;
            int zshift = -6;

            // Put a crosshair at the player's initial position.  Like everything else,
            // we draw to the right and down from the actual position.
            byte color = 5;
            for (int i = 0; i <= 2; i++) {
                vb.SetPixelIndex(129 + xshift, 128 + i + zshift, color);
                vb.SetPixelIndex(128 + xshift + i, 129 + zshift, color);
            }

            for (int index = 0; index < 255; index++) {
                byte type = mFileData[tfOffset + index * 2];
                if (type == 0xff) {
                    // end of list reached
                    break;
                }

                byte rawx = mFileData[xOffset + index * 2 + 1];
                byte rawz = mFileData[zOffset + index * 2 + 1];

                // Flip axes to match game and put "north" toward moon.
                int xpos = 128 - (sbyte)rawz;
                int zpos = 128 - (sbyte)rawx;
                xpos += xshift;
                zpos += zshift;

                switch (type) {
                    case 0x00:      // narrow pyramid
                        color = 1;
                        vb.SetPixelIndex(xpos + 2, zpos, color);
                        for (int i = 1; i < 5; i++) {
                            vb.SetPixelIndex(xpos + 2 - i/2, zpos + i, color);
                            vb.SetPixelIndex(xpos + 2 + i/2, zpos + i, color);
                        }
                        break;
                    case 0x01:      // tall box
                        color = 2;
                        for (int i = 0; i < 3; i++) {
                            for (int j = 0; j < 5; j++) {
                                if (i != 1 || j == 0 || j == 4) {
                                    vb.SetPixelIndex(xpos + i, zpos + j, color);
                                }
                            }
                        }
                        break;
                    case 0x0c:      // wide pyramid
                        color = 3;
                        for (int i = 0; i < 5; i++) {
                            vb.SetPixelIndex(xpos + 4 - i, zpos + i, color);
                            vb.SetPixelIndex(xpos + 4 + i, zpos + i, color);
                        }
                        break;
                    case 0x0f:      // short box
                        color = 4;
                        for (int i = 0; i < 3; i++) {
                            for (int j = 1; j < 4; j++) {
                                vb.SetPixelIndex(xpos + i, zpos + j, color);
                            }
                        }
                        break;
                    default:
                        mAppRef.ReportError("Found invalid object type $" + type.ToString("x2"));
                        return null;
                }
            }

            return vb;
        }
    }
}
