"""
  GeoSpatialLib module

  This library exposes common methods useds for creating the python GSERT
  geospatial engine.
"""

from pxpoint import table, pxcommon
import json
from geospatialdefaults import *  # NOQA


def create_geocode_input_table(call_id, address_line, city_line=None):
    """Create an input table with a single row."""
    input_table = table.Table()
    input_table.append_col(GeoSpatialDefaults.INPUT_ID_COL_NAME)
    input_table.append_col('$AddressLine')
    if city_line is None:
        input_table.append_row((call_id, address_line, ))
    else:
        input_table.append_col('$CityLine')
        input_table.append_row((str(call_id), address_line, city_line))
    return input_table


def create_query_input_table(call_id, lat, lon):
    """Create an input table with a single row."""
    geometry = pxcommon.get_wkt_point_from_dec_coords(lat, lon)
    input_table = table.Table()
    input_table.append_col(GeoSpatialDefaults.INPUT_ID_COL_NAME)
    input_table.append_col('InputGeometry')
    input_table.append_row((str(call_id), geometry))
    return input_table


def create_query_options(layer_alias, search_dist_meters=0):
    proc_opts = 'InputGeoColumn=InputGeometry'
    if search_dist_meters <= 0:
        proc_opts = ';'.join([proc_opts, '[{a}]{o}'.format(
            a=layer_alias, o=pxcommon.get_spatial_relation_spec(
                pxcommon.SpatialRelation.WITHIN))]
        )
    else:
        proc_opts = ';'.join([proc_opts, '[{a}]{o}'.format(
            a=layer_alias,
            o='FindNearest=T;[{a}]Distance={m}'.format(
                a=layer_alias, m=search_dist_meters))]
        )
    return proc_opts


def create_server_error_json_result(statuscode, message):
    """Creates a JSON string from a server error message."""
    return_obj = {}
    return_obj["result"] = []
    return_obj["status"] = statuscode
    return_obj["message"] = message
    return json.dumps(return_obj, sort_keys=True)


def create_json_result_with_status(
        output_table, error_table, return_code, max_results=-1):
    """Creates a JSON string from a PxPointSC result."""

    def sanitize_colname(colname):
        """Remove $ sign from col name if it exists"""
        return colname[1:] if colname[0] == '$' else colname

    result = []
    status = StatusCode.OK
    message = ""

    if return_code == pxcommon.PXP_SUCCESS:
        o_nrows = 0 if output_table is None else output_table.nrows
        if o_nrows == 0:
            status = StatusCode.SERVER_ERROR
            message = "Output table is empty, despite a successful geocode"
        else:
            if max_results > o_nrows or max_results == -1:
                max_results = o_nrows
            # Dictionary comprehension inside list comprehension

            result = [
                {sanitize_colname(output_table.col_names[i]):
                    str(output_table.rows[j][i]).encode("unicode_escape")
                    for i in xrange(output_table.ncols())}
                for j in xrange(max_results)
            ]
    elif error_table is None or error_table.nrows == 0:
        status = StatusCode.SERVER_ERROR
        message = "Error table is empty, despite apparent error"
    else:
        error_row = error_table.rows[0]
        error_code = str(error_row[0])
        error_message = str(error_row[1])
        status = StatusCode.SERVER_ERROR
        if return_code == pxcommon.PXP_INVALID_ARGUMENT:
            status = StatusCode.INVALID_REQUEST
        message = "Code: {c}. Message: {m}".format(
            c=error_code, m=error_message
        )

    return_obj = {}
    return_obj["result"] = result
    return_obj["status"] = status
    return_obj["message"] = message

    return json.dumps(return_obj, sort_keys=True)

if __name__ == "__main__":
    # Test Code
    DEFAULT_LICENSE_FILE = r'pxpoint.lic'
    LICENSE_KEY = 123456789
    DATASET_ROOT = r'/media/sf_pxse-data/geocode/PxPoint_2013_12'
    from pxpoint import pxpointsc
    (geocoder_handle, return_code, return_message) = pxpointsc.geocoder_init(
        DATASET_ROOT,
        ['NavteqStreet', 'Parcel', 'USPS'],
        DEFAULT_LICENSE_FILE,
        LICENSE_KEY
    )
    input_table = create_geocode_input_table(
        0, '3239 Redstone Road', 'Boulder CO'
    )

    output_table,
    error_table,
    return_code,
    return_message = pxpointsc.geocoder_geocode(
        geocoder_handle,
        input_table,
        GeoSpatialDefaults.GEOCODING_OUTPUT_COLS,
        GeoSpatialDefaults.ERROR_TABLE_COLS,
        GeoSpatialDefaults.BESTMATCH_FINDER_OPTIONS
    )
    print error_table
    print return_code
    result = create_json_result_with_status(
        output_table, error_table, return_code
    )
    result_dict = json.loads(result)
    print result_dict["status"]
    import pprint
    pprint.pprint(result_dict)
